import type IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { PasswordRecoveryService } from './password-recovery.service';
import type { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import type { PrismaPasswordResetRepository } from '../../infrastructure/repositories/prisma-password-reset.repository';
import type { PasswordHashService } from './password-hash.service';

describe('PasswordRecoveryService', () => {
  const evalRedis = jest.fn();
  const add = jest.fn();
  const consume = jest.fn<Promise<boolean>, [string, string]>();
  const hash = jest.fn();
  const service = new PasswordRecoveryService(
    { eval: evalRedis } as unknown as IORedis,
    new ConfigService({
      MAIL_HOST: 'localhost',
      MAIL_FROM: 'dss@example.test',
      PASSWORD_RESET_WEB_URL: 'http://localhost:3100/reset-password',
      JWT_REFRESH_SECRET: 'test-secret',
    }),
    { passwordRecovery: { add } } as unknown as QueueRegistryService,
    { consume } as unknown as PrismaPasswordResetRepository,
    { hash } as unknown as PasswordHashService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    evalRedis.mockResolvedValue(1);
    add.mockResolvedValue({});
    consume.mockResolvedValue(true);
    hash.mockResolvedValue('bcrypt-hash');
  });

  it('queues all valid addresses without querying accounts and returns the same response', async () => {
    expect(await service.request(' NEW@example.test ', '127.0.0.1')).toEqual({
      success: true,
    });
    expect(add).toHaveBeenCalledWith(
      'password-recovery.v1',
      expect.objectContaining({ email: 'new@example.test' }),
      expect.objectContaining({ removeOnComplete: true, removeOnFail: true }),
    );
    expect(consume).not.toHaveBeenCalled();
    expect(JSON.stringify(evalRedis.mock.calls)).not.toContain(
      'new@example.test',
    );
  });
  it('silently suppresses rate-limited delivery', async () => {
    evalRedis.mockResolvedValue(100);
    expect(await service.request('dev@example.test', '127.0.0.1')).toEqual({
      success: true,
    });
    expect(add).not.toHaveBeenCalled();
  });
  it('fails closed when Redis is unavailable', async () => {
    evalRedis.mockRejectedValue(new Error('offline'));
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
  });
  it('rejects expired or already consumed credentials', async () => {
    consume.mockResolvedValue(false);
    await expect(
      service.reset('a'.repeat(64), 'new-password', '127.0.0.1'),
    ).rejects.toThrow('invalid or expired');
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
