/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/rate-limits/redis-login-abuse-counter.integration.spec.ts
 *
 * 🎯 Purpose:
 * Proves login thresholds, independent expiry and scoped reset in disposable Redis.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHmac, randomUUID } from 'node:crypto';
import { RedisLoginAbuseCounter } from './redis-login-abuse-counter';

const redisSuite =
  process.env.RUN_AUTH_REDIS_TESTS === '1' ? describe : describe.skip;
redisSuite('login-abuse real Redis accounting', () => {
  const redis = new Redis({
    host: '127.0.0.1',
    port: Number(process.env.TEST_REDIS_PORT ?? 6380),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    connectTimeout: 2000,
  });
  const secret = 'synthetic-login-counter-secret';
  const counter = new RedisLoginAbuseCounter(
    redis,
    new ConfigService({ JWT_REFRESH_SECRET: secret }),
  );
  const policy = { failureLimit: 5, windowMs: 900_000, lockMs: 600_000 };
  const ownedKeys = new Set<string>();
  function keys(scope: 'identity' | 'ip', value: string) {
    const digest = createHmac('sha256', secret)
      .update(`login:${scope}:${value}`)
      .digest('hex');
    const failure = `dss:auth:login:${scope}:failures:${digest}`;
    const blocked = `dss:auth:login:${scope}:blocked:${digest}`;
    ownedKeys.add(failure);
    ownedKeys.add(blocked);
    return { failure, blocked };
  }
  beforeAll(async () => {
    await redis.connect();
  });
  afterEach(async () => {
    if (ownedKeys.size) await redis.del(...ownedKeys);
    ownedKeys.clear();
  });
  afterAll(() => {
    redis.disconnect();
  });

  it.each(['identity', 'ip'] as const)(
    'counts parallel %s failures without lost updates',
    async (scope) => {
      const value = randomUUID();
      const key = keys(scope, value);
      await Promise.all(
        Array.from({ length: 50 }, () =>
          counter.recordFailure(scope, value, policy),
        ),
      );
      expect(await redis.get(key.failure)).toBe('50');
      expect(await counter.isBlocked(scope, value)).toBe(true);
      expect(await redis.pttl(key.failure)).toBeGreaterThan(0);
      expect(await redis.pttl(key.failure)).toBeLessThanOrEqual(
        policy.windowMs,
      );
      expect(await redis.pttl(key.blocked)).toBeGreaterThan(0);
      expect(await redis.pttl(key.blocked)).toBeLessThanOrEqual(policy.lockMs);
    },
  );
  it('blocks at the threshold and renews only the block on subsequent failure', async () => {
    const value = randomUUID();
    const key = keys('identity', value);
    for (let attempt = 0; attempt < 4; attempt++) {
      await counter.recordFailure('identity', value, policy);
      expect(await counter.isBlocked('identity', value)).toBe(false);
    }
    await counter.recordFailure('identity', value, policy);
    expect(await counter.isBlocked('identity', value)).toBe(true);
    await redis.pexpire(key.failure, 120_000);
    await redis.pexpire(key.blocked, 120_000);
    await counter.recordFailure('identity', value, policy);
    expect(await redis.get(key.failure)).toBe('6');
    expect(await redis.pttl(key.failure)).toBeLessThanOrEqual(120_000);
    expect(await redis.pttl(key.blocked)).toBeGreaterThan(120_000);
  });
  it('expires a counter independently of an active block', async () => {
    const value = randomUUID();
    const key = keys('ip', value);
    await counter.recordFailure('ip', value, { ...policy, failureLimit: 1 });
    await redis.pexpireat(key.failure, 0);
    await counter.recordFailure('ip', value, policy);
    expect(await redis.get(key.failure)).toBe('1');
    expect(await counter.isBlocked('ip', value)).toBe(true);
    await redis.pexpireat(key.blocked, 0);
    expect(await counter.isBlocked('ip', value)).toBe(false);
    expect(await redis.get(key.failure)).toBe('1');
  });
  it('clears identity state while preserving IP and other identities', async () => {
    const value = randomUUID();
    const other = randomUUID();
    const identity = keys('identity', value);
    const ip = keys('ip', value);
    const unrelated = keys('identity', other);
    const immediate = { ...policy, failureLimit: 1 };
    await counter.recordFailure('identity', value, immediate);
    await counter.recordFailure('ip', value, immediate);
    await counter.recordFailure('identity', other, immediate);
    await counter.clearIdentity(value);
    await counter.clearIdentity(value);
    expect(await redis.mget(identity.failure, identity.blocked)).toEqual([
      null,
      null,
    ]);
    expect(
      await redis.mget(
        ip.failure,
        ip.blocked,
        unrelated.failure,
        unrelated.blocked,
      ),
    ).toEqual(['1', '1', '1', '1']);
  });
});
