export interface PoolInfo {
  poolId: number;
  bonded: string;
  memberCount: number;
  state: 'Open' | 'Blocked' | 'Destroying';
  commission: string;
  metadata?: string;
  roles?: {
    depositor: string;
    root: string;
    nominator: string;
    stateToggler: string;
  };
}

export interface StakingStatus {
  account: string;
  poolId?: number;
  bonded: string;
  unbonding: string;
  claimableRewards: string;
  isMember: boolean;
  balance?: string; // Account balance in Planck
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  message: string;
}

export interface JoinPoolParams {
  poolId: number;
  amount: string; // In smallest unit (Planck)
}

export interface BondExtraParams {
  amount: string;
}

export interface UnbondParams {
  amount: string;
}

export interface WithdrawUnbondedParams {
  numSlashingSpans?: number;
}

export interface ClaimRewardsParams {
  // Optional: specific pool ID, if not provided uses user's current pool
  poolId?: number;
}

export interface GetPoolInfoParams {
  poolId: number;
}
