import { Agent } from '../core/agent';
import {
  PoolInfo,
  StakingStatus,
  TransactionResult,
  JoinPoolParams,
  BondExtraParams,
  UnbondParams,
  WithdrawUnbondedParams,
  ClaimRewardsParams,
  GetPoolInfoParams,
} from '../types';
import {
  ValidationError,
  TransactionError,
  handleError,
} from '../utils/errors';
import {
  validateAmount,
  validatePoolId,
} from '../utils/validation';

export class StakingService {
  constructor(private agent: Agent) {}

  /**
   * Join a nomination pool
   */
  async joinPool(params: JoinPoolParams): Promise<TransactionResult> {
    try {
      validatePoolId(params.poolId);
      const amount = validateAmount(params.amount);

      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const joinPoolTool = (agentKit as any).joinPoolTool();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (joinPoolTool as any).invoke({
        poolId: params.poolId,
        amount: amount,
      });

      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          message: `Successfully joined pool ${params.poolId}`,
        };
      }

      throw new TransactionError(result.error || 'Failed to join pool');
    } catch (error) {
      const stakingError = handleError(error);
      return {
        success: false,
        error: stakingError.code,
        message: stakingError.message,
      };
    }
  }

  /**
   * Bond extra funds to existing stake
   */
  async bondExtra(params: BondExtraParams): Promise<TransactionResult> {
    try {
      const amount = validateAmount(params.amount);

      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bondExtraTool = (agentKit as any).bondExtraTool();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (bondExtraTool as any).invoke({
        amount: amount,
      });

      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          message: `Successfully bonded extra ${amount}`,
        };
      }

      throw new TransactionError(result.error || 'Failed to bond extra');
    } catch (error) {
      const stakingError = handleError(error);
      return {
        success: false,
        error: stakingError.code,
        message: stakingError.message,
      };
    }
  }

  /**
   * Unbond funds from pool
   */
  async unbond(params: UnbondParams): Promise<TransactionResult> {
    try {
      const amount = validateAmount(params.amount);

      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unbondTool = (agentKit as any).unbondTool();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (unbondTool as any).invoke({
        amount: amount,
      });

      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          message: `Successfully initiated unbonding of ${amount}`,
        };
      }

      throw new TransactionError(result.error || 'Failed to unbond');
    } catch (error) {
      const stakingError = handleError(error);
      return {
        success: false,
        error: stakingError.code,
        message: stakingError.message,
      };
    }
  }

  /**
   * Withdraw unbonded funds
   */
  async withdrawUnbonded(
    params?: WithdrawUnbondedParams
  ): Promise<TransactionResult> {
    try {
      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withdrawTool = (agentKit as any).withdrawUnbondedTool();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (withdrawTool as any).invoke({
        numSlashingSpans: params?.numSlashingSpans || 0,
      });

      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          message: 'Successfully withdrew unbonded funds',
        };
      }

      throw new TransactionError(result.error || 'Failed to withdraw unbonded');
    } catch (error) {
      const stakingError = handleError(error);
      return {
        success: false,
        error: stakingError.code,
        message: stakingError.message,
      };
    }
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(params?: ClaimRewardsParams): Promise<TransactionResult> {
    try {
      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const claimRewardsTool = (agentKit as any).claimRewardsTool();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (claimRewardsTool as any).invoke({
        poolId: params?.poolId,
      });

      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          message: 'Successfully claimed rewards',
        };
      }

      throw new TransactionError(result.error || 'Failed to claim rewards');
    } catch (error) {
      const stakingError = handleError(error);
      return {
        success: false,
        error: stakingError.code,
        message: stakingError.message,
      };
    }
  }

  /**
   * Get pool information
   */
  async getPoolInfo(params: GetPoolInfoParams): Promise<PoolInfo> {
    try {
      validatePoolId(params.poolId);

      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getPoolInfoTool = (agentKit as any).getPoolInfoTool();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (getPoolInfoTool as any).invoke({
        poolId: params.poolId,
      });

      if (!result.success) {
        throw new TransactionError(
          result.error || 'Failed to get pool info'
        );
      }

      // Transform the result to our PoolInfo type
      return {
        poolId: params.poolId,
        bonded: result.bonded || '0',
        memberCount: result.memberCount || 0,
        state: result.state || 'Open',
        commission: result.commission || '0',
        metadata: result.metadata,
        roles: result.roles,
      };
    } catch (error) {
      const stakingError = handleError(error);
      throw stakingError;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(account: string): Promise<string> {
    try {
      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (agentKit as any).api;

      if (!api) {
        throw new ValidationError('API not initialized');
      }

      // Query account balance
      const accountInfo = await api.query.system.account(account);
      const balance = accountInfo.data.free.toString();

      return balance;
    } catch (error) {
      const stakingError = handleError(error);
      throw stakingError;
    }
  }

  /**
   * Get current staking status for an account
   */
  async getStakingStatus(account: string): Promise<StakingStatus> {
    try {
      const agentKit = this.agent.getAgentKit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (agentKit as any).api;

      if (!api) {
        throw new ValidationError('API not initialized');
      }

      // Query pool membership
      const poolMembers = await api.query.nominationPools.poolMembers(account);
      const memberInfo = poolMembers.unwrapOr(null);

      let poolId: number | undefined;
      let bonded = '0';
      let unbonding = '0';

      if (memberInfo) {
        poolId = memberInfo.poolId.toNumber();
        bonded = memberInfo.points.toString();
        // Query unbonding info
        await api.query.nominationPools.unbondingPools(poolId);
        // Calculate unbonding amount (simplified)
        unbonding = '0'; // TODO: Calculate from unbonding pools
      }

      // Query claimable rewards (simplified)
      const claimableRewards = '0'; // TODO: Calculate from reward pools

      return {
        account,
        poolId,
        bonded,
        unbonding,
        claimableRewards,
        isMember: memberInfo !== null,
      };
    } catch (error) {
      const stakingError = handleError(error);
      throw stakingError;
    }
  }
}
