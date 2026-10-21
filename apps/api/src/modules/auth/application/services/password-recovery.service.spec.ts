/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/password-recovery.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies private recovery input, non-enumeration and post-commit alert ordering.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConfigService } from '@nestjs/config';
import { PasswordRecoveryService } from './password-recovery.service';
import type { PasswordResetRepository } from '../../domain/repositories/password-reset.repository.interface';
import type { PasswordHashService } from './password-hash.service';

describe('PasswordRecoveryService', () => {
  const allow = jest.fn();
  const add = jest.fn();
  const consume = jest.fn<
    ReturnType<PasswordResetRepository['consume']>,
    [string, string]
  >();
  const hash = jest.fn();
  const notify = jest.fn();
  const service = new PasswordRecoveryService(
    { allow },
    new ConfigService({
      MAIL_HOST: 'localhost',
      MAIL_FROM: 'dss@example.test',
      PASSWORD_RESET_WEB_URL: 'http://localhost:3100/reset-password',
      JWT_REFRESH_SECRET: 'test-secret',
    }),
    { enqueue: add },
    { consume },
    { hash } as unknown as PasswordHashService,
    { notify } as never,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    allow.mockResolvedValue(true);
    add.mockResolvedValue({});
    consume.mockResolvedValue({ email: 'dev@example.test' });
    hash.mockResolvedValue('bcrypt-hash');
    notify.mockResolvedValue(undefined);
  });

  it('queues all valid addresses without querying accounts and returns the same response', async () => {
    expect(await service.request(' NEW@example.test ', '127.0.0.1')).toEqual({
      success: true,
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.test' }),
    );
    expect(consume).not.toHaveBeenCalled();
    expect(allow).toHaveBeenCalledWith('email', 'new@example.test', 3);
    expect(allow).toHaveBeenCalledWith('request-ip', '127.0.0.1', 20);
  });
  it('silently suppresses rate-limited delivery', async () => {
    allow.mockResolvedValue(false);
    expect(await service.request('dev@example.test', '127.0.0.1')).toEqual({
      success: true,
    });
    expect(add).not.toHaveBeenCalled();
  });
  it('propagates request delivery failure without account lookup', async () => {
    add.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(
      service.request('unknown@example.test', '127.0.0.1'),
    ).rejects.toThrow('queue unavailable');
    expect(consume).not.toHaveBeenCalled();
  });
  it('fails closed when Redis is unavailable', async () => {
    allow.mockRejectedValue(new Error('offline'));
    await expect(
      service.request('dev@example.test', '127.0.0.1'),
    ).rejects.toThrow();
    expect(add).not.toHaveBeenCalled();
  });
  it('never passes a raw token or password to persistence', async () => {
    const token = 'a'.repeat(64);
    await service.reset(token, 'new-password', '127.0.0.1');
    expect(consume).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      'bcrypt-hash',
    );
    expect(consume.mock.calls[0][0]).not.toBe(token);
    expect(notify).toHaveBeenCalledWith(
      'PASSWORD_RECOVERED',
      'dev@example.test',
    );
  });
  it('rejects expired or already consumed credentials', async () => {
    consume.mockResolvedValue(null);
    await expect(
      service.reset('a'.repeat(64), 'new-password', '127.0.0.1'),
    ).rejects.toThrow('invalid or expired');
    expect(notify).not.toHaveBeenCalled();
  });
  it('applies reset budgets before hashing or consuming credentials', async () => {
    allow.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const token = 'a'.repeat(64);
    await expect(
      service.reset(token, 'new-password', '127.0.0.1'),
    ).rejects.toThrow('Too many attempts');
    expect(allow).toHaveBeenCalledWith('token', token, 5);
    expect(allow).toHaveBeenCalledWith('reset-ip', '127.0.0.1', 30);
    expect(hash).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it('never sends a recovered alert when the transaction fails', async () => {
    consume.mockRejectedValueOnce(new Error('audit rollback'));
    await expect(
      service.reset('a'.repeat(64), 'new-password', '127.0.0.1'),
    ).rejects.toThrow('audit rollback');
    expect(notify).not.toHaveBeenCalled();
  });
  it('rejects malformed credentials and bcrypt-truncated Unicode passwords before hashing', async () => {
    await expect(
      service.reset('bad', 'new-password', '127.0.0.1'),
    ).rejects.toThrow();
    await expect(
      service.reset('a'.repeat(64), '😀'.repeat(20), '127.0.0.1'),
    ).rejects.toThrow();
    expect(hash).not.toHaveBeenCalled();
  });
});
