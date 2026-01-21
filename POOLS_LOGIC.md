# Polkadot Nomination Pools - Logic & Behavior

## Overview

This document explains how Polkadot Nomination Pools work and how our implementation handles them.

## Key Rules

### 1. **One Pool Per Account** ⚠️

**Rule**: An account can only be a member of **ONE nomination pool at a time**.

- ✅ You can join a pool
- ❌ You **cannot** join multiple pools simultaneously
- ✅ To switch pools, you must:
  1. Unbond from your current pool
  2. Wait for the unbonding period (28 days on Polkadot mainnet, varies on testnets)
  3. Withdraw unbonded funds
  4. Join the new pool

### 2. **Pool States**

Pools can be in different states:
- **Open**: Accepting new members ✅
- **Blocked**: Not accepting new members ❌
- **Destroying**: Pool is being dissolved ⚠️

You can only join pools in the **Open** state.

### 3. **Bonding & Unbonding**

- **Bonded**: Funds locked in the pool, earning rewards
- **Unbonding**: Funds being withdrawn (28-day lock period)
- **Free Balance**: Available funds that can be transferred or bonded

### 4. **Operations Flow**

```
┌─────────────────────────────────────────────────────────┐
│                    Account States                       │
└─────────────────────────────────────────────────────────┘

1. NOT IN POOL
   ├─> join_pool(poolId, amount)
   └─> IN POOL (bonded = amount)

2. IN POOL
   ├─> bond_extra(amount) ──> bonded += amount
   ├─> unbond(amount) ──────> bonded -= amount, unbonding += amount
   ├─> claim_rewards() ─────> rewards → free balance
   └─> withdraw_unbonded() ──> unbonding → free balance (after 28 days)

3. SWITCHING POOLS
   ├─> unbond(all) ──────────> bonded = 0, unbonding = all
   ├─> wait 28 days
   ├─> withdraw_unbonded() ──> unbonding → free balance
   └─> join_pool(newPoolId) ─> bonded = amount (in new pool)
```

## Implementation Details

### Mock Mode (Offline)

When `MOCK_CHAIN=1` is set, the backend uses an in-memory state manager (`src/api/mock-state.ts`) that:

- ✅ Tracks account balances
- ✅ Enforces "one pool per account" rule
- ✅ Simulates unbonding period (28 days)
- ✅ Tracks bonded/unbonding amounts
- ✅ Accumulates rewards over time
- ✅ Validates all operations (insufficient balance, already in pool, etc.)

### Real Mode (Connected to Chain)

When connected to a real Polkadot network:

- All operations are executed on-chain via `@polkadot-agent-kit/sdk`
- State is read directly from the blockchain
- Transactions require network connectivity
- Real unbonding periods apply (28 days on Polkadot, varies on testnets)

## Common Scenarios

### Scenario 1: Join Your First Pool

```typescript
// 1. Check balance
GET /api/staking/status?account=5YourAddress
// Returns: { balance: "10000000000000", poolId: undefined, ... }

// 2. Join pool
POST /api/staking/join-pool
{ poolId: 1, amount: "1000000000000" } // 1 WND

// 3. Check status again
GET /api/staking/status?account=5YourAddress
// Returns: { balance: "9000000000000", poolId: 1, bonded: "1000000000000", ... }
```

### Scenario 2: Add More Funds (Bond Extra)

```typescript
// Already in pool 1 with 1 WND bonded
POST /api/staking/bond-extra
{ amount: "500000000000" } // 0.5 WND

// Status: { bonded: "1500000000000", balance: "8500000000000", ... }
```

### Scenario 3: Switch Pools

```typescript
// Currently in pool 1
// Step 1: Unbond all
POST /api/staking/unbond
{ amount: "1500000000000" } // All bonded amount

// Status: { bonded: "0", unbonding: "1500000000000", poolId: undefined, ... }

// Step 2: Wait 28 days (or use mock mode with time manipulation)

// Step 3: Withdraw unbonded
POST /api/staking/withdraw-unbonded

// Status: { balance: "10000000000000", unbonding: "0", ... }

// Step 4: Join new pool
POST /api/staking/join-pool
{ poolId: 2, amount: "2000000000000" }

// Status: { poolId: 2, bonded: "2000000000000", ... }
```

### Scenario 4: Claim Rewards

```typescript
// In pool, rewards accumulating
GET /api/staking/status
// Returns: { claimableRewards: "123000000000", ... }

// Claim rewards
POST /api/staking/claim-rewards
// Rewards added to free balance
```

## Error Handling

### Common Errors

1. **Already in Pool**
   ```
   Error: Already in pool 1. Unbond first to switch pools.
   Code: ALREADY_IN_POOL
   ```

2. **Insufficient Balance**
   ```
   Error: Insufficient balance. Need 1.0 WND + fees, have 0.5 WND
   Code: INSUFFICIENT_BALANCE
   ```

3. **Pool Not Open**
   ```
   Error: Cannot join pool 5: pool is Blocked
   Code: POOL_NOT_OPEN
   ```

4. **Unbonding Period Not Complete**
   ```
   Error: Unbonding period not complete. 15 days remaining.
   Code: UNBONDING_PERIOD_NOT_COMPLETE
   ```

5. **Not in Pool**
   ```
   Error: Not in any pool. Join a pool first.
   Code: NOT_IN_POOL
   ```

## Testing in Mock Mode

To test all functionality without network:

```bash
# Terminal 1: Start backend in mock mode
MOCK_CHAIN=1 pnpm dev:api

# Terminal 2: Start frontend
pnpm -C web dev --host

# Now you can:
# - Join pools
# - Bond extra
# - Unbond
# - Withdraw (after unbonding period)
# - Claim rewards
# - Switch pools
```

All operations will work end-to-end with state tracking!

## References

- [Polkadot Nomination Pools Documentation](https://wiki.polkadot.network/docs/learn-nomination-pools)
- [Polkadot Agent Kit](https://github.com/elasticlabs-org/polkadot-agent-kit)
