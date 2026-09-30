import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';
import { LoginAbuseProtectionService } from './login-abuse-protection.service';

describe('LoginAbuseProtectionService', () => {
  type UserUpdateInput = {
    where: { id: string };
    data: { loginFailedAttempts: number; loginLockedUntil: Date | null };
  };
  const updateUser = jest.fn((input: UserUpdateInput) => {
    void input;
    return Promise.resolve();
  });
  const redis = {
    exists: jest.fn().mockResolvedValue(0),
    eval: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
  };
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
  const tx = {
    $queryRaw: jest.fn(),
    user: {
      findUnique: jest.fn(),
      update: updateUser,
    },
    auditRecord: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const audit = { append: jest.fn() };
  const service = new LoginAbuseProtectionService(
    redis as never,
    config as never,
    prisma as never,
    audit as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.exists.mockResolvedValue(0);
  });

  it('rejects a Redis-blocked identity before credential verification', async () => {
    redis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(
      service.assertAllowed('astro@dss.test', '127.0.0.1'),
    ).rejects.toBeInstanceOf(LoginRateLimitedException);
  });

  it('creates a durable account lock on the configured failed attempt', async () => {
    tx.user.findUnique.mockResolvedValue({
      loginFailedAttempts: 4,
      loginLockedUntil: null,
    });
    await service.recordFailure(
      'astro@dss.test',
      '127.0.0.1',
      { id: 'user-1' },
      { ipAddress: '127.0.0.1', userAgent: 'DSS Test' },
    );
    const update = updateUser.mock.calls[0]?.[0];
    expect(update).toBeDefined();
    if (!update) throw new Error('Expected the account lock update.');
    expect(update.where).toEqual({ id: 'user-1' });
    expect(update.data.loginFailedAttempts).toBe(5);
    expect(update.data.loginLockedUntil).toBeInstanceOf(Date);
    expect(audit.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'auth.login.locked',
        result: 'DENIED',
      }),
    );
    expect(JSON.stringify(redis.eval.mock.calls)).not.toContain(
      'astro@dss.test',
    );
  });

  it('clears account counters and audits a successful login', async () => {
    await service.recordSuccess(
      'astro@dss.test',
      { id: 'user-1' },
      { ipAddress: '127.0.0.1' },
    );
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { loginFailedAttempts: 0, loginLockedUntil: null },
    });
    expect(audit.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'auth.login.succeeded' }),
    );
  });
});
