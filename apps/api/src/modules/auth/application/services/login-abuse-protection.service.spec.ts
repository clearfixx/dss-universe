/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/login-abuse-protection.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies throttling policy, fail-closed ordering and owned persistence delegation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';
import { LoginAbuseProtectionService } from './login-abuse-protection.service';

describe('LoginAbuseProtectionService', () => {
  const counters = {
    isBlocked: jest.fn(),
    recordFailure: jest.fn(),
    clearIdentity: jest.fn(),
  };
  const config = {
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
    counters,
    config as never,
    attempts,
    securityAlerts as never,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    counters.isBlocked.mockResolvedValue(false);
    counters.recordFailure.mockResolvedValue(undefined);
    counters.clearIdentity.mockResolvedValue(undefined);
    attempts.recordFailure.mockResolvedValue(null);
    attempts.recordSuccess.mockResolvedValue(undefined);
  });
  it('rejects a Redis-blocked identity before credential verification', async () => {
    counters.isBlocked.mockResolvedValueOnce(true);
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
    counters.recordFailure.mockRejectedValueOnce(
      new Error('Redis unavailable'),
    );
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
    expect(counters.recordFailure).toHaveBeenCalledWith(
      'identity',
      'astro@dss.test',
      {
        failureLimit: 5,
        windowMs: 900_000,
        lockMs: 900_000,
      },
    );
    expect(counters.recordFailure).toHaveBeenCalledWith('ip', '127.0.0.1', {
      failureLimit: 30,
      windowMs: 900_000,
      lockMs: 900_000,
    });
  });
  it('counts unknown accounts only in Redis without durable writes or notifications', async () => {
    await service.recordFailure('unknown@dss.test', undefined, null, {});
    expect(counters.recordFailure).toHaveBeenCalledTimes(2);
    expect(counters.recordFailure).toHaveBeenCalledWith(
      'ip',
      'unknown',
      expect.any(Object),
    );
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
    expect(counters.clearIdentity).toHaveBeenCalledTimes(1);
    expect(counters.clearIdentity).toHaveBeenCalledWith('astro@dss.test');
    expect(attempts.recordSuccess).toHaveBeenCalledWith('subject', {
      ipAddress: '127.0.0.1',
      userAgent: undefined,
    });
  });
  it('propagates block-read failure before allowing authentication', async () => {
    counters.isBlocked.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(
      service.assertAllowed('astro@dss.test', undefined),
    ).rejects.toThrow('Redis unavailable');
    expect(counters.isBlocked).toHaveBeenCalledWith('ip', 'unknown');
  });
  it('does not persist success when clearing identity accounting fails', async () => {
    counters.clearIdentity.mockRejectedValueOnce(
      new Error('Redis unavailable'),
    );
    await expect(
      service.recordSuccess('astro@dss.test', { id: 'subject' }, {}),
    ).rejects.toThrow('Redis unavailable');
    expect(attempts.recordSuccess).not.toHaveBeenCalled();
  });
});
