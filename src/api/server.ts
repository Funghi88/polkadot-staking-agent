import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Agent } from '../core/agent';
import { LLMAgent } from '../core/llm-agent';
import { config } from '../config';
import type { 
  JoinPoolParams, 
  BondExtraParams, 
  UnbondParams, 
  ClaimRewardsParams 
} from '../types';
import {
  mockGetStakingStatus,
  mockGetPoolInfo,
  mockJoinPool,
  mockBondExtra,
  mockUnbond,
  mockWithdrawUnbonded,
  mockClaimRewards,
} from './mock-state';

function isMockChainEnabled(): boolean {
  return (
    process.env.MOCK_CHAIN === '1' ||
    process.env.MOCK_CHAIN === 'true' ||
    process.env.OFFLINE_MODE === '1' ||
    process.env.OFFLINE_MODE === 'true'
  );
}

function mockTxHash(prefix: string) {
  // Not a real hash; just deterministic + unique-ish for UI/tests.
  return `0xmock_${prefix}_${Date.now().toString(16)}`;
}

export function buildServer(): FastifyInstance {
  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  // Initialize agent and services (scoped to this server instance)
  let agent: Agent | null = null;
  let llmAgent: LLMAgent | null = null;
  let initializationError: Error | null = null;
  let isInitializing = false;

  async function initializeAgent() {
    // Offline mode: never try to touch network.
    if (isMockChainEnabled()) {
      throw new Error('MOCK_CHAIN enabled - agent initialization skipped');
    }

    // If already initialized, return
    if (agent && llmAgent) {
      return { agent, llmAgent };
    }

    // If there was a previous error, throw it
    if (initializationError) {
      throw initializationError;
    }

    // If currently initializing, wait a bit and retry
    if (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return initializeAgent();
    }

    // Start initialization with retry logic
    isInitializing = true;
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        fastify.log.info(`Attempting to initialize agent (attempt ${attempt}/${maxRetries})...`);
        agent = new Agent();

        // Use a longer timeout for initialization (120 seconds for VPN/proxy connections)
        const connectionTimeout = parseInt(process.env.POLKADOT_CONNECTION_TIMEOUT || '120000', 10);
        await Promise.race([
          agent.initialize(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Initialization timeout after ${connectionTimeout/1000} seconds. If using QuickQ VPN, try switching to Global Mode.`)), connectionTimeout)
          )
        ]);

        llmAgent = new LLMAgent(agent);
        await llmAgent.registerTools();

        isInitializing = false;
        fastify.log.info('✅ Agent initialized successfully');
        return { agent, llmAgent };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        fastify.log.warn(
          { message: errorMessage, attempt, maxRetries },
          `Agent initialization attempt ${attempt} failed`
        );

        // If not the last attempt, wait a bit before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries failed
    isInitializing = false;
    const errorMessage = lastError?.message || 'Unknown error';
    fastify.log.error(
      { message: errorMessage, stack: lastError?.stack },
      'Agent initialization failed after all retries'
    );
    initializationError = lastError || new Error('Agent initialization failed');
    throw initializationError;
  }

  // Health check endpoint
  fastify.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString(), mockChain: isMockChainEnabled() };
  });

  // API routes
  fastify.register(async function (fastify) {
  // Register CORS for API routes
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
  });
  
  // Initialize agent lazily on first request (each endpoint handles it)

  // Get staking status
  fastify.get<{ Querystring: { account: string } }>('/staking/status', async (request, reply) => {
    try {
      const { account } = request.query;
      if (!account) {
        return reply.code(400).send({
          success: false,
          error: 'Missing account parameter',
          message: 'Account address is required',
        });
      }

      // Mock mode: use state manager
      if (isMockChainEnabled()) {
        const status = mockGetStakingStatus(account);
        return reply.send({
          success: true,
          data: status,
        });
      }

      // Try to initialize agent, but don't block if it fails
      // Use shorter timeout for read operations (5 seconds) to fail fast and return default data
      let agentReady = false;
      try {
        await Promise.race([
          initializeAgent(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 5000))
        ]);
        agentReady = true;
      } catch (initError) {
        fastify.log.warn(
          { err: initError as unknown },
          'Agent initialization failed or timed out, returning default status'
        );
        // Return default/empty status with balance field (set to undefined to indicate unavailable)
        const defaultStatus = {
          account: account,
          poolId: undefined,
          bonded: '0',
          unbonding: '0',
          claimableRewards: '0',
          isMember: false,
          balance: undefined, // Balance unavailable due to connection failure
        };
        
        return reply.send({
          success: true,
          data: defaultStatus,
        });
      }

      if (!llmAgent || !agentReady) {
        // Return default status if agent not ready
        return reply.send({
          success: true,
          data: {
            account: account,
            poolId: undefined,
            bonded: '0',
            unbonding: '0',
            claimableRewards: '0',
            isMember: false,
            balance: undefined, // Balance unavailable due to connection failure
          },
        });
      }

      // Agent is ready - get real status
      const stakingService = llmAgent.getStakingService();
      
      // Get status and balance with timeout to prevent hanging
      const statusPromise = stakingService.getStakingStatus(account);
      const statusTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Status query timeout')), 15000)
      );
      
      let status;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status = (await Promise.race([statusPromise, statusTimeout])) as any;
      } catch (statusError) {
        fastify.log.warn(
          { err: statusError as unknown },
          'Failed to get staking status, returning default'
        );
        // Return default status if query fails
        return reply.send({
          success: true,
          data: {
            account: account,
            poolId: undefined,
            bonded: '0',
            unbonding: '0',
            claimableRewards: '0',
            isMember: false,
            balance: undefined, // Balance unavailable due to connection failure
          },
        });
      }
      
      // Add balance to status with timeout
      try {
        const balancePromise = stakingService.getBalance(account);
        const balanceTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Balance query timeout')), 10000)
        );
        const balance = await Promise.race([balancePromise, balanceTimeout]);
        status.balance = balance;
      } catch (error) {
        fastify.log.warn({ err: error as unknown }, 'Failed to get balance');
        // Continue without balance - status is still valid
      }

      return reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to get staking status');
      
      // Return default status instead of error
      return reply.send({
        success: true,
        data: {
          account: request.query.account || '',
          poolId: undefined,
          bonded: '0',
          unbonding: '0',
          claimableRewards: '0',
          isMember: false,
        },
      });
    }
  });

  // Get pool info
  fastify.get<{ Querystring: { poolId: string } }>('/staking/pool-info', async (request, reply) => {
    try {
      const poolId = parseInt(request.query.poolId);
      if (isNaN(poolId) || poolId <= 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid pool ID',
          message: 'Pool ID must be a positive number',
        });
      }

      // Mock mode: return deterministic pool info
      if (isMockChainEnabled()) {
        return reply.send({
          success: true,
          data: {
            poolId,
            bonded: '500000000000000',
            memberCount: 42,
            state: 'Open',
            commission: '0%',
            metadata: 'Mock Pool (offline mode)',
            roles: {
              depositor: '5MockDepositor',
              root: '5MockRoot',
              nominator: '5MockNominator',
              stateToggler: '5MockStateToggler',
            },
          },
        });
      }

      // Mock mode: use state manager
      if (isMockChainEnabled()) {
        const poolInfo = mockGetPoolInfo(poolId);
        return reply.send({
          success: true,
          data: poolInfo,
        });
      }

      // Try to initialize agent, but don't block if it fails
      // Use shorter timeout for read operations (5 seconds) to fail fast and return default data
      let agentReady = false;
      try {
        await Promise.race([
          initializeAgent(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 5000))
        ]);
        agentReady = true;
      } catch (initError) {
        fastify.log.warn(
          { err: initError as unknown },
          'Agent initialization failed or timed out for pool info, returning default data'
        );
        // Return default pool info instead of error
        return reply.send({
          success: true,
          data: {
            poolId: poolId,
            bonded: '0',
            memberCount: 0,
            state: 'Unknown',
            commission: '0%',
            metadata: 'Pool information unavailable - unable to connect to Polkadot network',
            roles: {
              depositor: 'N/A',
              root: 'N/A',
              nominator: 'N/A',
              stateToggler: 'N/A',
            },
          },
        });
      }

      if (!llmAgent || !agentReady) {
        // Return default pool info if agent not ready
        return reply.send({
          success: true,
          data: {
            poolId: poolId,
            bonded: '0',
            memberCount: 0,
            state: 'Unknown',
            commission: '0%',
            metadata: 'Pool information unavailable - agent not initialized',
            roles: {
              depositor: 'N/A',
              root: 'N/A',
              nominator: 'N/A',
              stateToggler: 'N/A',
            },
          },
        });
      }

      const stakingService = llmAgent.getStakingService();
      const poolInfo = await stakingService.getPoolInfo({ poolId });

      return reply.send({
        success: true,
        data: poolInfo,
      });
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to get pool info');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Return default pool info instead of error
      const poolId = parseInt(request.query.poolId) || 0;
      return reply.send({
        success: true,
        data: {
          poolId: poolId,
          bonded: '0',
          memberCount: 0,
          state: 'Unknown',
          commission: '0%',
          metadata: `Pool information unavailable: ${errorMessage}`,
          roles: {
            depositor: 'N/A',
            root: 'N/A',
            nominator: 'N/A',
            stateToggler: 'N/A',
          },
        },
      });
    }
  });

  // Join pool (Add liquidity to a pool - first time joining)
  fastify.post<{ Body: JoinPoolParams }>('/staking/join-pool', async (request, reply) => {
    try {
      const { poolId, amount } = request.body;

      if (!poolId || poolId <= 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid pool ID',
          message: 'Pool ID must be a positive number',
        });
      }

      if (!amount || amount.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid amount',
          message: 'Amount is required (in Planck - smallest unit)',
        });
      }

      if (isMockChainEnabled()) {
        // Get account from query params (frontend passes it)
        const account = (request.query as { account?: string }).account || '5DummyAccountForMockMode';
        const result = mockJoinPool(account, poolId, amount);
        
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: result.error || 'JOIN_POOL_FAILED',
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          txHash: mockTxHash('join_pool'),
          message: result.message,
        });
      }

      // Try to initialize agent with timeout
      let agentReady = false;
      try {
        await Promise.race([
          initializeAgent(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 10000))
        ]);
        agentReady = true;
      } catch (initError) {
        fastify.log.warn({ err: initError as unknown }, 'Agent initialization failed for join pool');
        return reply.code(503).send({
          success: false,
          error: 'Service unavailable',
          message: 'Unable to connect to Polkadot network. Please ensure the API server can connect to Westend testnet and try again.',
          details: 'Join Pool requires an active connection to the blockchain. Please check your network connection and RPC endpoint.',
        });
      }

      if (!llmAgent || !agentReady) {
        return reply.code(503).send({
          success: false,
          error: 'Service unavailable',
          message: 'Agent not initialized. Please check your backend configuration.',
        });
      }

      const stakingService = llmAgent.getStakingService();
      const result = await stakingService.joinPool({ poolId, amount });

      return reply.send({
        success: result.success,
        txHash: result.txHash,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to join pool');
      return reply.code(500).send({
        success: false,
        error: 'Failed to join pool',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Bond extra (Add more liquidity to existing pool position)
  fastify.post<{ Body: BondExtraParams }>('/staking/bond-extra', async (request, reply) => {
    try {
      const { amount } = request.body;

      if (!amount || amount.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid amount',
          message: 'Amount is required (in Planck - smallest unit)',
        });
      }

      if (isMockChainEnabled()) {
        const account = (request.query as { account?: string }).account || '5DummyAccountForMockMode';
        const result = mockBondExtra(account, amount);
        
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: result.error || 'BOND_EXTRA_FAILED',
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          txHash: mockTxHash('bond_extra'),
          message: result.message,
        });
      }

      // Try to initialize agent with timeout
      let agentReady = false;
      try {
        await Promise.race([
          initializeAgent(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 10000))
        ]);
        agentReady = true;
      } catch (initError) {
        fastify.log.warn({ err: initError as unknown }, 'Agent initialization failed for bond extra');
        return reply.code(503).send({
          success: false,
          error: 'Service unavailable',
          message: 'Unable to connect to Polkadot network. Please ensure the API server can connect to Westend testnet and try again.',
        });
      }

      if (!llmAgent || !agentReady) {
        return reply.code(503).send({
          success: false,
          error: 'Service unavailable',
          message: 'Agent not initialized. Please check your backend configuration.',
        });
      }

      const stakingService = llmAgent.getStakingService();
      const result = await stakingService.bondExtra({ amount });

      return reply.send({
        success: result.success,
        txHash: result.txHash,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to bond extra');
      return reply.code(500).send({
        success: false,
        error: 'Failed to bond extra',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Unbond
  fastify.post<{ Body: UnbondParams }>('/staking/unbond', async (request, reply) => {
    try {
      if (isMockChainEnabled()) {
        const { amount } = request.body;
        if (!amount || amount.trim() === '') {
          return reply.code(400).send({
            success: false,
            error: 'Invalid amount',
            message: 'Amount is required',
          });
        }
        const account = (request.query as { account?: string }).account || '5DummyAccountForMockMode';
        const result = mockUnbond(account, amount);
        
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: result.error || 'UNBOND_FAILED',
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          txHash: mockTxHash('unbond'),
          message: result.message,
        });
      }

      // Initialize agent if needed
      await initializeAgent();
      
      if (!llmAgent) {
        throw new Error('Agent not initialized');
      }

      const { amount } = request.body;

      if (!amount || amount.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid amount',
          message: 'Amount is required',
        });
      }

      const stakingService = llmAgent.getStakingService();
      const result = await stakingService.unbond({ amount });

      return reply.send(result);
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to unbond');
      return reply.code(500).send({
        success: false,
        error: 'Failed to unbond',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Withdraw unbonded
  fastify.post<{ Body?: { numSlashingSpans?: number } }>('/staking/withdraw-unbonded', async (request, reply) => {
    try {
      if (isMockChainEnabled()) {
        const account = (request.query as { account?: string }).account || '5DummyAccountForMockMode';
        const result = mockWithdrawUnbonded(account);
        
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: result.error || 'WITHDRAW_FAILED',
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          txHash: mockTxHash('withdraw_unbonded'),
          message: result.message,
        });
      }

      // Initialize agent if needed
      await initializeAgent();
      
      if (!llmAgent) {
        throw new Error('Agent not initialized');
      }

      const stakingService = llmAgent.getStakingService();
      const result = await stakingService.withdrawUnbonded(request.body);

      return reply.send(result);
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to withdraw unbonded');
      return reply.code(500).send({
        success: false,
        error: 'Failed to withdraw unbonded',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Claim rewards
  fastify.post<{ Body?: ClaimRewardsParams }>('/staking/claim-rewards', async (request, reply) => {
    try {
      if (isMockChainEnabled()) {
        const poolId = request.body?.poolId;
        const account = (request.query as { account?: string }).account || '5DummyAccountForMockMode';
        const result = mockClaimRewards(account, poolId);
        
        if (!result.success) {
          return reply.code(400).send({
            success: false,
            error: result.error || 'CLAIM_REWARDS_FAILED',
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          txHash: mockTxHash('claim_rewards'),
          message: result.message,
        });
      }

      // Initialize agent if needed
      await initializeAgent();
      
      if (!llmAgent) {
        throw new Error('Agent not initialized');
      }

      const stakingService = llmAgent.getStakingService();
      const result = await stakingService.claimRewards(request.body);

      return reply.send(result);
    } catch (error) {
      fastify.log.error({ err: error as unknown }, 'Failed to claim rewards');
      return reply.code(500).send({
        success: false,
        error: 'Failed to claim rewards',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  }, { prefix: '/api' });

  // Error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reply.code((error as any).statusCode || 500).send({
      success: false,
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
    });
  });

  // Graceful shutdown (scoped)
  const shutdown = async () => {
    fastify.log.info('👋 Shutting down server...');
    if (agent) {
      await agent.disconnect();
    }
    await fastify.close();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return fastify;
}

// Start server (only when executed directly)
async function start() {
  const fastify = buildServer();
  try {
    // Use config.apiPort which defaults to 3001, or override with PORT env var
    const port = config.apiPort;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 API Server running on http://${host}:${port}`);
    console.log(`📡 Health check: http://${host}:${port}/health`);
    console.log(`🔗 API endpoints: http://${host}:${port}/api/staking/*`);
    console.log(`🧪 Mock mode: ${isMockChainEnabled() ? 'ON (MOCK_CHAIN)' : 'OFF'}`);
    console.log(`\n⚠️  Note: Agent will initialize on first API request (unless MOCK_CHAIN is enabled)`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
