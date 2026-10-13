/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/rate-limits/redis-recovery-rate-limit.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes keyed attempt counters, fixed expiry and fail-closed errors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import { createHmac } from 'node:crypto';
import { RedisRecoveryRateLimit } from './redis-recovery-rate-limit';

describe('RedisRecoveryRateLimit', () => {
  const evalRedis = jest.fn();
  const adapter = new RedisRecoveryRateLimit(
    { eval: evalRedis } as unknown as IORedis,
    new ConfigService({ JWT_REFRESH_SECRET: 'synthetic-secret' }),
  );
  beforeEach(() => {
    evalRedis.mockReset().mockResolvedValue(1);
  });
  it.each(['email', 'request-ip', 'token', 'reset-ip'])(
    'preserves the exact private %s key and atomic fixed-window script',
    async (scope) => {
      await adapter.allow(
        scope as Parameters<RedisRecoveryRateLimit['allow']>[0],
        'private-value',
        3,
      );
      const digest = createHmac('sha256', 'synthetic-secret')
        .update(`password-recovery:${scope}:private-value`)
        .digest('hex');
      expect(evalRedis).toHaveBeenCalledWith(
        `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n`,
        1,
        `dss:recovery:${scope}:${digest}`,
      );
      expect(JSON.stringify(evalRedis.mock.calls)).not.toContain(
        'private-value',
      );
    },
  );
  it('allows the boundary and denies the next attempt', async () => {
    evalRedis.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    expect(await adapter.allow('email', 'value', 3)).toBe(true);
    expect(await adapter.allow('email', 'value', 3)).toBe(false);
  });
  it('propagates Redis failure rather than allowing', async () => {
    evalRedis.mockRejectedValueOnce(new Error('offline'));
    await expect(adapter.allow('email', 'value', 3)).rejects.toThrow('offline');
  });
  it('requires the HMAC secret before touching Redis', async () => {
    const missing = new RedisRecoveryRateLimit(
      { eval: evalRedis } as unknown as IORedis,
      new ConfigService({}),
    );
    await expect(missing.allow('email', 'value', 3)).rejects.toThrow();
    expect(evalRedis).not.toHaveBeenCalled();
  });
});
