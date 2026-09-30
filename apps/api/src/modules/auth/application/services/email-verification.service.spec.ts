import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  const redis = { eval: jest.fn().mockResolvedValue(1) };
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          MAIL_HOST: 'smtp.test',
          MAIL_FROM: 'no-reply@dss.test',
          EMAIL_VERIFICATION_WEB_URL: 'https://dss.test/verify-email',
        })[key],
    ),
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        email: 'astro@dss.test',
        emailVerifiedAt: null,
        status: 'ACTIVE',
      }),
    },
  };
  const queues = { emailVerification: { add: jest.fn() } };
  const credentials = { consume: jest.fn() };
  const service = new EmailVerificationService(
    redis as never,
    config as never,
    prisma as never,
    queues as never,
    credentials as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('queues a credential-free verification job for an unverified viewer', async () => {
    await expect(service.request('user-1', '127.0.0.1')).resolves.toEqual({
      success: true,
    });
    expect(queues.emailVerification.add).toHaveBeenCalledWith(
      'email-verification.v1',
      expect.objectContaining({ userId: 'user-1', email: 'astro@dss.test' }),
      expect.any(Object),
    );
  });

  it('accepts a valid single-use token digest', async () => {
    credentials.consume.mockResolvedValue(true);
    const token = 'a'.repeat(64);
    await expect(service.verify(token)).resolves.toEqual({ success: true });
    expect(credentials.consume).toHaveBeenCalledWith(
      createHash('sha256').update(token).digest('hex'),
    );
  });

  it('rejects malformed or consumed links without leaking details', async () => {
    await expect(service.verify('bad')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    credentials.consume.mockResolvedValue(false);
    await expect(service.verify('b'.repeat(64))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
