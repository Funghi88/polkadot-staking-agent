/**
 * Mock State Manager for Offline/Mock Chain Mode
 * 
 * Tracks account balances, pool memberships, and staking state
 * to simulate Polkadot nomination pools behavior.
 * 
 * Key Rules:
 * - One account can only be in ONE pool at a time
 * - To switch pools, must unbond first (28-day unbonding period)
 * - Bonded amounts are locked until unbonded
 * - Rewards accumulate over time (simplified)
 */

interface AccountState {
  balance: string; // Free balance in Planck
  poolId?: number; // Current pool membership (only one allowed)
  bonded: string; // Amount bonded in current pool
  unbonding: string; // Amount currently unbonding
  unbondingEra?: number; // Era when unbonding completes (simplified: just timestamp)
  claimableRewards: string; // Accumulated rewards
}

interface PoolState {
  poolId: number;
  bonded: string; // Total bonded in pool
  memberCount: number;
  state: 'Open' | 'Blocked' | 'Destroying';
  commission: string;
  metadata?: string;
}

// In-memory state (per server instance)
const accountStates = new Map<string, AccountState>();
const poolStates = new Map<number, PoolState>();

// Default starting balance (10 WND = 10,000,000,000,000 Planck)
const DEFAULT_BALANCE = '10000000000000';

// Unbonding period: 28 days (simplified to 28 * 24 * 60 * 60 * 1000 ms)
const UNBONDING_PERIOD_MS = 28 * 24 * 60 * 60 * 1000;

/**
 * Get or create account state
 */
export function getAccountState(account: string): AccountState {
  if (!accountStates.has(account)) {
    accountStates.set(account, {
      balance: DEFAULT_BALANCE,
      bonded: '0',
      unbonding: '0',
      claimableRewards: '0',
    });
  }
  return accountStates.get(account)!;
}

/**
 * Get or create pool state
 */
export function getPoolState(poolId: number): PoolState {
  if (!poolStates.has(poolId)) {
    poolStates.set(poolId, {
      poolId,
      bonded: '0',
      memberCount: 0,
      state: 'Open',
      commission: '0%',
      metadata: `Pool ${poolId} (Mock)`,
    });
  }
  return poolStates.get(poolId)!;
}

/**
 * Join a pool (first time or switching)
 */
export function mockJoinPool(account: string, poolId: number, amount: string): {
  success: boolean;
  message: string;
  error?: string;
} {
  const accountState = getAccountState(account);
  const poolState = getPoolState(poolId);
  const amountBigInt = BigInt(amount);
  const balanceBigInt = BigInt(accountState.balance);
  const bondedBigInt = BigInt(accountState.bonded);
  const unbondingBigInt = BigInt(accountState.unbonding);

  // Check if pool is open
  if (poolState.state !== 'Open') {
    return {
      success: false,
      message: `Cannot join pool ${poolId}: pool is ${poolState.state}`,
      error: 'POOL_NOT_OPEN',
    };
  }

  // Check if already in a different pool
  if (accountState.poolId !== undefined && accountState.poolId !== poolId) {
    return {
      success: false,
      message: `Already in pool ${accountState.poolId}. Unbond first to switch pools.`,
      error: 'ALREADY_IN_POOL',
    };
  }

  // Check if has unbonding funds (must wait for unbonding period)
  if (unbondingBigInt > 0n) {
    const now = Date.now();
    const unbondingCompleteTime = accountState.unbondingEra || 0;
    if (now < unbondingCompleteTime) {
      const daysLeft = Math.ceil((unbondingCompleteTime - now) / (24 * 60 * 60 * 1000));
      return {
        success: false,
        message: `Cannot join pool: ${formatBalance(accountState.unbonding)} WND still unbonding (${daysLeft} days remaining). Withdraw unbonded funds first.`,
        error: 'FUNDS_UNBONDING',
      };
    }
  }

  // Reserve for fees (approximately 0.01 WND)
  const minReserve = BigInt('10000000000');
  const totalNeeded = amountBigInt + minReserve;

  // Check balance
  if (balanceBigInt < totalNeeded) {
    return {
      success: false,
      message: `Insufficient balance. Need ${formatBalance(amount)} WND + fees, have ${formatBalance(accountState.balance)} WND`,
      error: 'INSUFFICIENT_BALANCE',
    };
  }

  // If already in this pool, this is bond_extra (handled separately)
  if (accountState.poolId === poolId) {
    return {
      success: false,
      message: `Already in pool ${poolId}. Use bond_extra to add more funds.`,
      error: 'ALREADY_IN_POOL',
    };
  }

  // Execute join: deduct from balance, add to bonded
  const newBalance = balanceBigInt - amountBigInt;
  const newBonded = bondedBigInt + amountBigInt;

  accountState.balance = newBalance.toString();
  accountState.poolId = poolId;
  accountState.bonded = newBonded.toString();

  // Update pool state
  const poolBondedBigInt = BigInt(poolState.bonded);
  poolState.bonded = (poolBondedBigInt + amountBigInt).toString();
  if (bondedBigInt === 0n) {
    // New member
    poolState.memberCount += 1;
  }

  return {
    success: true,
    message: `Successfully joined pool ${poolId} with ${formatBalance(amount)} WND`,
  };
}

/**
 * Bond extra funds to existing pool
 */
export function mockBondExtra(account: string, amount: string): {
  success: boolean;
  message: string;
  error?: string;
} {
  const accountState = getAccountState(account);
  const amountBigInt = BigInt(amount);
  const balanceBigInt = BigInt(accountState.balance);

  // Must be in a pool
  if (accountState.poolId === undefined) {
    return {
      success: false,
      message: 'Not in any pool. Join a pool first.',
      error: 'NOT_IN_POOL',
    };
  }

  // Check balance
  const minReserve = BigInt('10000000000');
  if (balanceBigInt < amountBigInt + minReserve) {
    return {
      success: false,
      message: `Insufficient balance. Need ${formatBalance(amount)} WND + fees`,
      error: 'INSUFFICIENT_BALANCE',
    };
  }

  const poolState = getPoolState(accountState.poolId);

  // Update balances
  accountState.balance = (balanceBigInt - amountBigInt).toString();
  accountState.bonded = (BigInt(accountState.bonded) + amountBigInt).toString();
  poolState.bonded = (BigInt(poolState.bonded) + amountBigInt).toString();

  return {
    success: true,
    message: `Successfully bonded extra ${formatBalance(amount)} WND to pool ${accountState.poolId}`,
  };
}

/**
 * Unbond funds from pool
 */
export function mockUnbond(account: string, amount: string): {
  success: boolean;
  message: string;
  error?: string;
} {
  const accountState = getAccountState(account);
  const amountBigInt = BigInt(amount);
  const bondedBigInt = BigInt(accountState.bonded);

  // Must be in a pool
  if (accountState.poolId === undefined) {
    return {
      success: false,
      message: 'Not in any pool',
      error: 'NOT_IN_POOL',
    };
  }

  // Can't unbond more than bonded
  if (amountBigInt > bondedBigInt) {
    return {
      success: false,
      message: `Cannot unbond ${formatBalance(amount)} WND: only ${formatBalance(accountState.bonded)} WND bonded`,
      error: 'INSUFFICIENT_BONDED',
    };
  }

  const poolState = getPoolState(accountState.poolId);

  // Update state: move from bonded to unbonding
  accountState.bonded = (bondedBigInt - amountBigInt).toString();
  accountState.unbonding = (BigInt(accountState.unbonding) + amountBigInt).toString();
  accountState.unbondingEra = Date.now() + UNBONDING_PERIOD_MS;

  poolState.bonded = (BigInt(poolState.bonded) - amountBigInt).toString();

  // If fully unbonded, remove from pool
  if (accountState.bonded === '0') {
    accountState.poolId = undefined;
    poolState.memberCount = Math.max(0, poolState.memberCount - 1);
  }

  return {
    success: true,
    message: `Initiated unbonding of ${formatBalance(amount)} WND (28-day unbonding period)`,
  };
}

/**
 * Withdraw unbonded funds
 */
export function mockWithdrawUnbonded(account: string): {
  success: boolean;
  message: string;
  error?: string;
} {
  const accountState = getAccountState(account);
  const unbondingBigInt = BigInt(accountState.unbonding);

  if (unbondingBigInt === 0n) {
    return {
      success: false,
      message: 'No unbonded funds to withdraw',
      error: 'NO_UNBONDED_FUNDS',
    };
  }

  // Check if unbonding period has passed
  const now = Date.now();
  const unbondingCompleteTime = accountState.unbondingEra || 0;

  if (now < unbondingCompleteTime) {
    const daysLeft = Math.ceil((unbondingCompleteTime - now) / (24 * 60 * 60 * 1000));
    return {
      success: false,
      message: `Unbonding period not complete. ${daysLeft} days remaining.`,
      error: 'UNBONDING_PERIOD_NOT_COMPLETE',
    };
  }

  // Move from unbonding to free balance
  const amountWithdrawn = unbondingBigInt.toString();
  accountState.balance = (BigInt(accountState.balance) + unbondingBigInt).toString();
  accountState.unbonding = '0';
  accountState.unbondingEra = undefined;

  return {
    success: true,
    message: `Withdrew ${formatBalance(amountWithdrawn)} WND (now available as free balance)`,
  };
}

/**
 * Claim rewards (simplified: just accumulate some rewards)
 */
export function mockClaimRewards(account: string, poolId?: number): {
  success: boolean;
  message: string;
  error?: string;
} {
  const accountState = getAccountState(account);

  // Must be in a pool
  if (accountState.poolId === undefined) {
    return {
      success: false,
      message: 'Not in any pool',
      error: 'NOT_IN_POOL',
    };
  }

  // If poolId specified, must match
  if (poolId !== undefined && accountState.poolId !== poolId) {
    return {
      success: false,
      message: `Not in pool ${poolId}. Currently in pool ${accountState.poolId}`,
      error: 'WRONG_POOL',
    };
  }

  const rewardsBigInt = BigInt(accountState.claimableRewards);

  if (rewardsBigInt === 0n) {
    return {
      success: true,
      message: 'No rewards to claim',
    };
  }

  // Move rewards to free balance
  accountState.balance = (BigInt(accountState.balance) + rewardsBigInt).toString();
  accountState.claimableRewards = '0';

  return {
    success: true,
    message: `Claimed ${formatBalance(rewardsBigInt.toString())} WND in rewards`,
  };
}

/**
 * Get staking status for account
 */
export function mockGetStakingStatus(account: string) {
  const accountState = getAccountState(account);

  // Simulate some rewards accumulation (1% of bonded per "era" - simplified)
  if (accountState.poolId !== undefined && accountState.bonded !== '0') {
    const bondedBigInt = BigInt(accountState.bonded);
    // Add small reward increment (0.1% per status check - just for demo)
    const rewardIncrement = bondedBigInt / 1000n;
    accountState.claimableRewards = (
      BigInt(accountState.claimableRewards) + rewardIncrement
    ).toString();
  }

  return {
    account,
    poolId: accountState.poolId,
    bonded: accountState.bonded,
    unbonding: accountState.unbonding,
    claimableRewards: accountState.claimableRewards,
    isMember: accountState.poolId !== undefined,
    balance: accountState.balance,
  };
}

/**
 * Get pool info
 */
export function mockGetPoolInfo(poolId: number) {
  const poolState = getPoolState(poolId);

  return {
    poolId: poolState.poolId,
    bonded: poolState.bonded,
    memberCount: poolState.memberCount,
    state: poolState.state,
    commission: poolState.commission,
    metadata: poolState.metadata,
    roles: {
      depositor: 'N/A',
      root: 'N/A',
      nominator: 'N/A',
      stateToggler: 'N/A',
    },
  };
}

/**
 * Format balance from Planck to WND
 */
function formatBalance(planck: string): string {
  const balance = BigInt(planck);
  const wnd = Number(balance) / 1e12;
  if (wnd < 0.000001) return '< 0.000001';
  return wnd.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Reset all mock state (for testing)
 */
export function resetMockState() {
  accountStates.clear();
  poolStates.clear();
}
