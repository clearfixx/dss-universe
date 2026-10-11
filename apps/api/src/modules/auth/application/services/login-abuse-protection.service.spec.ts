/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/login-abuse-protection.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies fail-closed throttling, private keys and owned persistence delegation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';
import { LoginAbuseProtectionService } from './login-abuse-protection.service';

describe('LoginAbuseProtectionService', () => {
  const redis = { exists: jest.fn(), eval: jest.fn(), del: jest.fn() };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
    get: jest.fn(
      (key: string) =>
        ({
          AUTH_LOGIN_FAILURE_LIMIT: 5,
          AUTH_LOGIN_LOCK_MINUTES: 15,
          AUTH_LOGIN_IP_FAILURE_LIMIT: 30,
          AUTH_LOGIN_WINDOW_MINUTES: 15,
        })[key],
    ),
  };
  const attempts = { recordFailure: jest.fn(), recordSuccess: jest.fn() };
  const securityAlerts = { notify: jest.fn() };
  const service = new LoginAbuseProtectionService(
    redis as never,
    config as never,
    attempts,
    securityAlerts as never,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    redis.exists.mockResolvedValue(0);
    redis.eval.mockResolvedValue(1);
    redis.del.mockResolvedValue(1);
    attempts.recordFailure.mockResolvedValue(null);
    attempts.recordSuccess.mockResolvedValue(undefined);
  });
  it('rejects a Redis-blocked identity before credential verification', async () => {
    redis.exists.mockResolvedValueOnce(1);
    await expect(
      service.assertAllowed('astro@dss.test', '127.0.0.1'),
    ).rejects.toBeInstanceOf(LoginRateLimitedException);
  });
  it('rejects a durable account lock even when Redis has no block', async () => {
    await expect(
      service.assertAllowed('astro@dss.test', '127.0.0.1', {
        id: 'subject',
        loginLockedUntil: new Date(Date.now() + 60_000),
      }),
    ).rejects.toBeInstanceOf(LoginRateLimitedException);
  });
  it('fails closed on unavailable Redis before durable writes', async () => {
    redis.eval.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(
      service.recordFailure(
        'astro@dss.test',
        '127.0.0.1',
        { id: 'subject' },
        {},
      ),
    ).rejects.toThrow('Redis unavailable');
    expect(attempts.recordFailure).not.toHaveBeenCalled();
    expect(securityAlerts.notify).not.toHaveBeenCalled();
  });
  it('delegates narrow configured policy and alerts only on a committed transition', async () => {
    attempts.recordFailure.mockResolvedValue({ email: 'current@dss.test' });
    await service.recordFailure(
      'astro@dss.test',
      '127.0.0.1',
      { id: 'subject' },
      { ipAddress: '127.0.0.1', userAgent: 'DSS Test' },
    );
    expect(attempts.recordFailure).toHaveBeenCalledWith(
      'subject',
      { failureLimit: 5, lockMs: 900_000 },
      { ipAddress: '127.0.0.1', userAgent: 'DSS Test' },
    );
    expect(securityAlerts.notify).toHaveBeenCalledWith(
      'ACCOUNT_LOCKED',
      'current@dss.test',
    );
    expect(JSON.stringify(redis.eval.mock.calls)).not.toContain(
      'astro@dss.test',
    );
    expect(JSON.stringify(redis.eval.mock.calls)).not.toContain('127.0.0.1');
    expect((redis.eval.mock.calls[0] as unknown[]).slice(-3)).toEqual([
      900_000, 5, 900_000,
    ]);
    expect((redis.eval.mock.calls[1] as unknown[]).slice(-3)).toEqual([
      900_000, 30, 900_000,
    ]);
  });
  it('counts unknown accounts only in Redis without durable writes or notifications', async () => {
    await service.recordFailure('unknown@dss.test', undefined, null, {});
    expect(redis.eval).toHaveBeenCalledTimes(2);
    expect(attempts.recordFailure).not.toHaveBeenCalled();
    expect(securityAlerts.notify).not.toHaveBeenCalled();
  });
  it('does not alert when the durable transaction rolls back', async () => {
    attempts.recordFailure.mockRejectedValueOnce(new Error('audit rollback'));
    await expect(
      service.recordFailure('astro@dss.test', undefined, { id: 'subject' }, {}),
    ).rejects.toThrow('audit rollback');
    expect(securityAlerts.notify).not.toHaveBeenCalled();
  });
  it('clears only identity counters and delegates successful-login audit', async () => {
    await service.recordSuccess(
      'astro@dss.test',
      { id: 'subject' },
      { ipAddress: '127.0.0.1' },
    );
    expect(redis.del).toHaveBeenCalledTimes(2);
    expect(
      redis.del.mock.calls.every(([key]: [string]) =>
        key.includes(':identity:'),
      ),
    ).toBe(true);
    expect(attempts.recordSuccess).toHaveBeenCalledWith('subject', {
      ipAddress: '127.0.0.1',
      userAgent: undefined,
    });
  });
});
