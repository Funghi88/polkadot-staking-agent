import { z } from 'zod';
import { createAction, createSuccessResponse, type ToolConfig } from '@polkadot-agent-kit/llm';
import { StakingService } from '../services/staking.service';
import { handleError } from '../utils/errors';

/**
 * Create all staking-related tools for LLM integration
 */
export function createStakingTools(stakingService: StakingService) {
  // Join Pool Tool
  const joinPoolTool = {
    async invoke(args: { poolId: number; amount: string; chain?: string }) {
      try {
        const result = await stakingService.joinPool({
          poolId: args.poolId,
          amount: args.amount,
        });

        if (result.success) {
          return createSuccessResponse(result.message, JSON.stringify({ txHash: result.txHash }));
        }

        return createSuccessResponse(result.message, JSON.stringify({ error: result.error }));
      } catch (error) {
        const stakingError = handleError(error);
        return createSuccessResponse(stakingError.message, JSON.stringify({ error: stakingError.code }));
      }
    },
  };

  const joinPoolConfig: ToolConfig = {
    name: 'join_pool',
    description:
      'Join a Polkadot nomination pool by providing the pool ID and amount to stake. This will bond your tokens and start earning staking rewards.',
    schema: z.object({
      poolId: z.number().describe('The ID of the nomination pool to join'),
      amount: z
        .string()
        .describe('The amount to stake in the smallest unit (Planck)'),
      chain: z
        .string()
        .optional()
        .describe('The chain to interact with, e.g. polkadot, westend'),
    }),
  };

  // Bond Extra Tool
  const bondExtraTool = {
    async invoke(args: { amount: string; chain?: string }) {
      try {
        const result = await stakingService.bondExtra({
          amount: args.amount,
        });

        if (result.success) {
          return createSuccessResponse(result.message, JSON.stringify({ txHash: result.txHash }));
        }

        return createSuccessResponse(result.message, JSON.stringify({ error: result.error }));
      } catch (error) {
        const stakingError = handleError(error);
        return createSuccessResponse(stakingError.message, JSON.stringify({ error: stakingError.code }));
      }
    },
  };

  const bondExtraConfig: ToolConfig = {
    name: 'bond_extra',
    description:
      'Add additional funds to your existing stake in a nomination pool. This increases your bonded amount and potential rewards.',
    schema: z.object({
      amount: z
        .string()
        .describe('The additional amount to bond in the smallest unit (Planck)'),
      chain: z
        .string()
        .optional()
        .describe('The chain to interact with, e.g. polkadot, westend'),
    }),
  };

  // Unbond Tool
  const unbondTool = {
    async invoke(args: { amount: string; chain?: string }) {
      try {
        const result = await stakingService.unbond({
          amount: args.amount,
        });

        if (result.success) {
          return createSuccessResponse(result.message, JSON.stringify({ txHash: result.txHash }));
        }

        return createSuccessResponse(result.message, JSON.stringify({ error: result.error }));
      } catch (error) {
        const stakingError = handleError(error);
        return createSuccessResponse(stakingError.message, JSON.stringify({ error: stakingError.code }));
      }
    },
  };

  const unbondConfig: ToolConfig = {
    name: 'unbond',
    description:
      'Initiate unbonding of staked funds from a nomination pool. The funds will be locked for the unbonding period before they can be withdrawn.',
    schema: z.object({
      amount: z
        .string()
        .describe('The amount to unbond in the smallest unit (Planck)'),
      chain: z
        .string()
        .optional()
        .describe('The chain to interact with, e.g. polkadot, westend'),
    }),
  };

  // Withdraw Unbonded Tool
  const withdrawUnbondedTool = {
    async invoke(args: { numSlashingSpans?: number; chain?: string }) {
      try {
        const result = await stakingService.withdrawUnbonded({
          numSlashingSpans: args.numSlashingSpans,
        });

        if (result.success) {
          return createSuccessResponse(result.message, JSON.stringify({ txHash: result.txHash }));
        }

        return createSuccessResponse(result.message, JSON.stringify({ error: result.error }));
      } catch (error) {
        const stakingError = handleError(error);
        return createSuccessResponse(stakingError.message, JSON.stringify({ error: stakingError.code }));
      }
    },
  };

  const withdrawUnbondedConfig: ToolConfig = {
    name: 'withdraw_unbonded',
    description:
      'Withdraw funds that have completed the unbonding period. These funds are now available to transfer.',
    schema: z.object({
      numSlashingSpans: z
        .number()
        .optional()
        .describe('Number of slashing spans (usually 0 for most users)'),
      chain: z
        .string()
        .optional()
        .describe('The chain to interact with, e.g. polkadot, westend'),
    }),
  };

  // Claim Rewards Tool
  const claimRewardsTool = {
    async invoke(args: { poolId?: number; chain?: string }) {
      try {
        const result = await stakingService.claimRewards({
          poolId: args.poolId,
        });

        if (result.success) {
          return createSuccessResponse(result.message, JSON.stringify({ txHash: result.txHash }));
        }

        return createSuccessResponse(result.message, JSON.stringify({ error: result.error }));
      } catch (error) {
        const stakingError = handleError(error);
        return createSuccessResponse(stakingError.message, JSON.stringify({ error: stakingError.code }));
      }
    },
  };

  const claimRewardsConfig: ToolConfig = {
    name: 'claim_rewards',
    description:
      'Claim accumulated staking rewards from a nomination pool. Rewards are distributed periodically based on pool performance.',
    schema: z.object({
      poolId: z
        .number()
        .optional()
        .describe('Optional pool ID. If not provided, uses the user\'s current pool'),
      chain: z
        .string()
        .optional()
        .describe('The chain to interact with, e.g. polkadot, westend'),
    }),
  };

  // Get Pool Info Tool
  const getPoolInfoTool = {
    async invoke(args: { poolId: number; chain?: string }) {
      try {
        const poolInfo = await stakingService.getPoolInfo({
          poolId: args.poolId,
        });

        return createSuccessResponse(
          `Pool ${poolInfo.poolId} information retrieved`,
          JSON.stringify({
            poolId: poolInfo.poolId,
            bonded: poolInfo.bonded,
            memberCount: poolInfo.memberCount,
            state: poolInfo.state,
            commission: poolInfo.commission,
            metadata: poolInfo.metadata,
          })
        );
      } catch (error) {
        const stakingError = handleError(error);
        return createSuccessResponse(stakingError.message, JSON.stringify({ error: stakingError.code }));
      }
    },
  };

  const getPoolInfoConfig: ToolConfig = {
    name: 'get_pool_info',
    description:
      'Retrieve detailed information about a nomination pool including total bonded amount, member count, state, commission rate, and metadata.',
    schema: z.object({
      poolId: z.number().describe('The ID of the nomination pool to query'),
      chain: z
        .string()
        .optional()
        .describe('The chain to interact with, e.g. polkadot, westend'),
    }),
  };

  // Create and return all actions
  return [
    createAction(joinPoolTool, joinPoolConfig),
    createAction(bondExtraTool, bondExtraConfig),
    createAction(unbondTool, unbondConfig),
    createAction(withdrawUnbondedTool, withdrawUnbondedConfig),
    createAction(claimRewardsTool, claimRewardsConfig),
    createAction(getPoolInfoTool, getPoolInfoConfig),
  ];
}
