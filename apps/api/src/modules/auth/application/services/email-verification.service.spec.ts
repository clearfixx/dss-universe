/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/email-verification.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies orchestration through the owned verification port without database access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  const limits = { allow: jest.fn().mockResolvedValue(true) };
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
  const delivery = { enqueue: jest.fn() };
  const credentials = {
    consume: jest.fn(),
    findPendingDestination: jest
      .fn()
      .mockResolvedValue({ email: 'astro@dss.test' }),
  };
  const service = new EmailVerificationService(
    limits,
    config as never,
    delivery,
    credentials,
  );

  beforeEach(() => jest.clearAllMocks());

  it('queues a credential-free verification job for an unverified viewer', async () => {
    await expect(service.request('user-1', '127.0.0.1')).resolves.toEqual({
      success: true,
    });
    expect(delivery.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', email: 'astro@dss.test' }),
    );
    expect(credentials.findPendingDestination).toHaveBeenCalledWith('user-1');
  });

  it('returns generic success without rate-limit or queue work for no pending destination', async () => {
    credentials.findPendingDestination.mockResolvedValueOnce(null);
    await expect(service.request('unknown', '127.0.0.1')).resolves.toEqual({
      success: true,
    });
    expect(limits.allow).not.toHaveBeenCalled();
    expect(delivery.enqueue).not.toHaveBeenCalled();
  });

  it('does not deliver when either resend limit is exhausted', async () => {
    limits.allow.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(service.request('user-1', '127.0.0.1')).resolves.toEqual({
      success: true,
    });
    expect(delivery.enqueue).not.toHaveBeenCalled();
  });

  it('propagates authoritative storage failure without sending mail', async () => {
    credentials.findPendingDestination.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(service.request('user-1', '127.0.0.1')).rejects.toThrow(
      'database unavailable',
    );
    expect(delivery.enqueue).not.toHaveBeenCalled();
  });
  it('fails closed when attempt accounting is unavailable', async () => {
    limits.allow.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(service.request('user-1', '127.0.0.1')).rejects.toThrow(
      'Redis unavailable',
    );
    expect(limits.allow).toHaveBeenCalledWith('user', 'user-1', 3);
    expect(limits.allow).toHaveBeenCalledWith('ip', '127.0.0.1', 20);
    expect(delivery.enqueue).not.toHaveBeenCalled();
  });

  it('keeps registration successful if asynchronous delivery fails', async () => {
    delivery.enqueue.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(
      service.requestAfterRegistration('user-1', 'astro@dss.test'),
    ).resolves.toBeUndefined();
    expect(credentials.findPendingDestination).not.toHaveBeenCalled();
  });

  it('propagates resend delivery failure rather than applying registration policy', async () => {
    delivery.enqueue.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(service.request('user-1', '127.0.0.1')).rejects.toThrow(
      'queue unavailable',
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
