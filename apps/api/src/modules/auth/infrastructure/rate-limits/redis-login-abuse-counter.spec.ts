/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/rate-limits/redis-login-abuse-counter.spec.ts
 *
 * 🎯 Purpose:
 * Checks key compatibility, millisecond policy and fail-closed adapter errors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import { createHmac } from 'node:crypto';
import { RedisLoginAbuseCounter } from './redis-login-abuse-counter';

describe('RedisLoginAbuseCounter', () => {
  const redis = { exists: jest.fn(), eval: jest.fn(), del: jest.fn() };
  const counters = new RedisLoginAbuseCounter(
    redis as unknown as IORedis,
    new ConfigService({ JWT_REFRESH_SECRET: 'synthetic-secret' }),
  );
  const policy = { failureLimit: 5, windowMs: 900_000, lockMs: 600_000 };
  beforeEach(() => {
    jest.resetAllMocks();
    redis.exists.mockResolvedValue(0);
    redis.eval.mockResolvedValue(1);
    redis.del.mockResolvedValue(1);
  });
  it.each(['identity', 'ip'] as const)(
    'retains private %s keys and millisecond policy',
    async (scope) => {
      const digest = createHmac('sha256', 'synthetic-secret')
        .update(`login:${scope}:private-value`)
        .digest('hex');
      expect(await counters.isBlocked(scope, 'private-value')).toBe(false);
      expect(redis.exists).toHaveBeenCalledWith(
        `dss:auth:login:${scope}:blocked:${digest}`,
      );
      await counters.recordFailure(scope, 'private-value', policy);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        2,
        `dss:auth:login:${scope}:failures:${digest}`,
        `dss:auth:login:${scope}:blocked:${digest}`,
        900_000,
        5,
        600_000,
      );
      expect(JSON.stringify(redis.eval.mock.calls)).not.toContain(
        'private-value',
      );
      redis.exists.mockResolvedValueOnce(1);
      expect(await counters.isBlocked(scope, 'private-value')).toBe(true);
    },
  );
  it('clears only the two identity keys', async () => {
    const digest = createHmac('sha256', 'synthetic-secret')
      .update('login:identity:private-value')
      .digest('hex');
    await counters.clearIdentity('private-value');
    expect(redis.del.mock.calls).toEqual([
      [`dss:auth:login:identity:failures:${digest}`],
      [`dss:auth:login:identity:blocked:${digest}`],
    ]);
  });
  it('propagates read, increment and clear failures', async () => {
    redis.exists.mockRejectedValueOnce(new Error('offline'));
    await expect(counters.isBlocked('identity', 'value')).rejects.toThrow(
      'offline',
    );
    redis.eval.mockRejectedValueOnce(new Error('offline'));
    await expect(counters.recordFailure('ip', 'value', policy)).rejects.toThrow(
      'offline',
    );
    redis.del.mockRejectedValueOnce(new Error('offline'));
    await expect(counters.clearIdentity('value')).rejects.toThrow('offline');
  });
  it('requires the key secret before accessing Redis', async () => {
    const missing = new RedisLoginAbuseCounter(
      redis as unknown as IORedis,
      new ConfigService({}),
    );
    await expect(
      missing.recordFailure('identity', 'value', policy),
    ).rejects.toThrow();
    expect(redis.eval).not.toHaveBeenCalled();
  });
});
