import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { buildServer } from './server';

// Force mock mode for these tests (no network dependency)
process.env.MOCK_CHAIN = '1';

describe('API server (MOCK_CHAIN)', () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok + mockChain', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.mockChain).toBe(true);
  });

  it('GET /api/staking/status returns deterministic mock status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/staking/status?account=5Dummy',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.account).toBe('5Dummy');
    expect(body.data.balance).toBeTypeOf('string');
  });

  it('GET /api/staking/pool-info returns mock pool info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/staking/pool-info?poolId=1',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.poolId).toBe(1);
    expect(body.data.metadata).toContain('Mock');
  });

  it('POST /api/staking/join-pool succeeds in mock mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/staking/join-pool',
      payload: { poolId: 1, amount: '1000' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.txHash).toMatch(/^0xmock_join_pool_/);
  });

  it('POST /api/staking/bond-extra succeeds in mock mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/staking/bond-extra',
      payload: { amount: '1000' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.txHash).toMatch(/^0xmock_bond_extra_/);
  });

  it('POST /api/staking/unbond validates amount', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/api/staking/unbond',
      payload: { amount: '' },
    });
    expect(bad.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/staking/unbond',
      payload: { amount: '1000' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().success).toBe(true);
  });

  it('POST /api/staking/withdraw-unbonded returns a meaningful error in mock mode when unbonding is not yet complete', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/staking/withdraw-unbonded',
      payload: { numSlashingSpans: 0 },
    });
    // In our stateful mock, withdraw can fail if there are no unbonded funds
    // or the (simulated) unbonding period has not completed.
    expect([200, 400]).toContain(res.statusCode);
    const body = res.json();
    if (res.statusCode === 200) {
      expect(body.success).toBe(true);
    } else {
      expect(body.success).toBe(false);
      expect(body.message).toBeTypeOf('string');
    }
  });

  it('POST /api/staking/claim-rewards succeeds in mock mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/staking/claim-rewards',
      payload: { poolId: 1 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});

