/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/rate-limits/redis-attempt-limits.integration.spec.ts
 *
 * 🎯 Purpose:
 * Proves concurrent attempt accounting and fixed expiry in disposable Redis.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHmac, randomUUID } from 'node:crypto';
import { RedisRecoveryRateLimit } from './redis-recovery-rate-limit';
import { RedisVerificationRateLimit } from './redis-verification-rate-limit';

const redisSuite =
  process.env.RUN_AUTH_REDIS_TESTS === '1' ? describe : describe.skip;
const cases = [
  {
    name: 'recovery',
    prefix: 'password-recovery',
    namespace: 'dss:recovery',
    scope: 'email',
    create: (redis: Redis, config: ConfigService) => {
      const adapter = new RedisRecoveryRateLimit(redis, config);
      return (value: string, limit: number) =>
        adapter.allow('email', value, limit);
    },
  },
  {
    name: 'verification',
    prefix: 'email-verification',
    namespace: 'dss:email-verification',
    scope: 'user',
    create: (redis: Redis, config: ConfigService) => {
      const adapter = new RedisVerificationRateLimit(redis, config);
      return (value: string, limit: number) =>
        adapter.allow('user', value, limit);
    },
  },
];

redisSuite.each(cases)('$name real Redis attempt budget', (entry) => {
  const redis = new Redis({
    host: '127.0.0.1',
    port: Number(process.env.TEST_REDIS_PORT ?? 6380),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    connectTimeout: 2000,
  });
  const secret = 'synthetic-limit-test-secret';
  const allow = entry.create(
    redis,
    new ConfigService({ JWT_REFRESH_SECRET: secret }),
  );
  const keys = new Set<string>();
  function keyFor(value: string, signingSecret = secret) {
    const digest = createHmac('sha256', signingSecret)
      .update(`${entry.prefix}:${entry.scope}:${value}`)
      .digest('hex');
    const key = `${entry.namespace}:${entry.scope}:${digest}`;
    keys.add(key);
    return key;
  }
  beforeAll(async () => {
    await redis.connect();
  });
  afterEach(async () => {
    if (keys.size) await redis.del(...keys);
    keys.clear();
  });
  afterAll(() => {
    redis.disconnect();
  });

  it('counts every concurrent attempt atomically with only the allowed winners', async () => {
    const value = randomUUID();
    const key = keyFor(value);
    const outcomes = await Promise.all(
      Array.from({ length: 50 }, () => allow(value, 3)),
    );
    expect(outcomes.filter(Boolean)).toHaveLength(3);
    expect(await redis.get(key)).toBe('50');
    expect(await redis.pttl(key)).toBeGreaterThan(0);
    expect(await redis.pttl(key)).toBeLessThanOrEqual(900_000);
    expect(key).not.toContain(value);
  });
  it('does not slide the existing window and restarts only after expiry', async () => {
    const value = randomUUID();
    const key = keyFor(value);
    await allow(value, 1);
    await redis.pexpire(key, 120_000);
    expect(await allow(value, 1)).toBe(false);
    expect(await redis.pttl(key)).toBeLessThanOrEqual(120_000);
    expect(await redis.pttl(key)).toBeGreaterThan(0);
    await redis.pexpireat(key, 0);
    expect(await allow(value, 1)).toBe(true);
    expect(await redis.get(key)).toBe('1');
    expect(await redis.pttl(key)).toBeGreaterThan(120_000);
  });
  it('separates identities and signing secrets without resetting existing counters', async () => {
    const value = randomUUID();
    keyFor(value);
    expect(await allow(value, 1)).toBe(true);
    expect(await allow(value, 1)).toBe(false);
    const other = randomUUID();
    keyFor(other);
    expect(await allow(other, 1)).toBe(true);
    const rotated = 'synthetic-rotated-secret';
    keyFor(value, rotated);
    expect(
      await entry.create(
        redis,
        new ConfigService({ JWT_REFRESH_SECRET: rotated }),
      )(value, 1),
    ).toBe(true);
    expect(await allow(value, 1)).toBe(false);
  });
});
