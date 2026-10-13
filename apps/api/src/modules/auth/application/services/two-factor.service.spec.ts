/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/two-factor.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies second-factor orchestration through its private persistence contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import { TwoFactorRequiredException } from '../../domain/exceptions/two-factor-required.exception';
import type { PasswordHashService } from './password-hash.service';
import type { TotpService } from './totp.service';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorService', () => {
  const credentials = {
    status: jest.fn(),
    begin: jest.fn(),
    confirm: jest.fn(),
    findEnabledSecret: jest.fn(),
    consumeRecovery: jest.fn(),
    findPasswordHash: jest.fn(),
    disable: jest.fn(),
  };
  const compare = jest.fn();
  const totp = {
    createSecret: jest.fn(() => 'BASE32SECRET'),
    encrypt: jest.fn(() => 'encrypted'),
    decrypt: jest.fn(() => 'BASE32SECRET'),
    verify: jest.fn(),
    recoveryCode: jest.fn(() => 'recovery'),
    recoveryHash: jest.fn((code: string) => `hash:${code.toLowerCase()}`),
  };
  const service = new TwoFactorService(
    credentials,
    { compare } as unknown as PasswordHashService,
    totp as unknown as TotpService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    credentials.begin.mockResolvedValue(true);
    credentials.confirm.mockResolvedValue('confirmed');
    credentials.findEnabledSecret.mockResolvedValue('encrypted');
    credentials.consumeRecovery.mockResolvedValue(true);
    credentials.findPasswordHash.mockResolvedValue('password-hash');
    totp.verify.mockReturnValue(true);
    compare.mockResolvedValue(true);
    credentials.disable.mockResolvedValue('disabled');
  });
  it('delegates safe status without credential reads', async () => {
    credentials.status.mockResolvedValue({
      enabled: true,
      recoveryCodesRemaining: 2,
    });
    expect(await service.status('u')).toEqual({
      enabled: true,
      recoveryCodesRemaining: 2,
    });
    expect(credentials.findEnabledSecret).not.toHaveBeenCalled();
  });
  it('creates encrypted pending setup with the existing URI', async () => {
    const setup = await service.begin('u', 'dev@example.test');
    expect(setup.secret).toBe('BASE32SECRET');
    expect(setup.otpauthUri).toContain('DSS%20Universe%3Adev%40example.test');
    expect(credentials.begin).toHaveBeenCalledWith('u', 'encrypted');
    credentials.begin.mockResolvedValueOnce(false);
    await expect(service.begin('u', 'dev@example.test')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('passes a pure locked verifier and only recovery hashes to persistence', async () => {
    const result = await service.confirm('u', '123456');
    expect(result.recoveryCodes).toHaveLength(10);
    const args = credentials.confirm.mock.calls[0] as [
      string,
      (encrypted: string) => boolean,
      string[],
    ];
    expect(args[0]).toBe('u');
    expect(args[1]('encrypted')).toBe(true);
    expect(totp.verify).toHaveBeenCalledWith('BASE32SECRET', '123456');
    expect(args[2]).toEqual(Array<string>(10).fill('hash:recovery'));
  });
  it.each(['missing', 'invalid'])(
    'does not return recovery plaintext for %s confirmation',
    async (outcome) => {
      credentials.confirm.mockResolvedValueOnce(outcome);
      await expect(service.confirm('u', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
  it('requires a code when enabled and avoids recovery consumption for valid TOTP', async () => {
    await expect(service.assertLogin('u')).rejects.toBeInstanceOf(
      TwoFactorRequiredException,
    );
    await expect(service.assertLogin('u', '123456')).resolves.toBeUndefined();
    expect(credentials.consumeRecovery).not.toHaveBeenCalled();
  });
  it('delegates one-use recovery proof and denies rejected consumption', async () => {
    totp.verify.mockReturnValue(false);
    await service.assertLogin('u', 'RECOVERY');
    expect(credentials.consumeRecovery).toHaveBeenCalledWith(
      'u',
      'hash:recovery',
    );
    credentials.consumeRecovery.mockResolvedValueOnce(false);
    await expect(service.assertLogin('u', 'RECOVERY')).rejects.toBeInstanceOf(
      TwoFactorRequiredException,
    );
  });
  it('does not require proof for absent enabled state but fails closed on storage error', async () => {
    credentials.findEnabledSecret.mockResolvedValueOnce(null);
    await expect(service.assertLogin('u')).resolves.toBeUndefined();
    credentials.findEnabledSecret.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(service.assertLogin('u', '123456')).rejects.toThrow(
      'database unavailable',
    );
  });
  it('requires password and second factor before delegating atomic disable', async () => {
    credentials.disable.mockResolvedValueOnce('invalid-password');
    await expect(
      service.disable('u', 'wrong', '123456'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.disable('u', 'correct', '123456')).resolves.toEqual({
      success: true,
    });
    const args = credentials.disable.mock.calls[1] as [
      string,
      (hash: string) => Promise<boolean>,
      (secret: string) => boolean,
      string,
    ];
    expect(args[0]).toBe('u');
    expect(await args[1]('password-hash')).toBe(true);
    expect(args[2]('encrypted')).toBe(true);
    expect(args[3]).toBe('hash:123456');
    expect(credentials.findPasswordHash).not.toHaveBeenCalled();
    expect(credentials.findEnabledSecret).not.toHaveBeenCalled();
    expect(compare).toHaveBeenLastCalledWith('correct', 'password-hash');
  });
  it('denies invalid factor and propagates transactional failures', async () => {
    credentials.disable.mockResolvedValueOnce('invalid-factor');
    await expect(service.disable('u', 'correct', 'bad')).rejects.toBeInstanceOf(
      TwoFactorRequiredException,
    );
    credentials.disable.mockRejectedValueOnce(new Error('audit failed'));
    await expect(service.disable('u', 'correct', '123456')).rejects.toThrow(
      'audit failed',
    );
  });
  it('does not return recovery plaintext after transaction failure', async () => {
    credentials.confirm.mockRejectedValueOnce(new Error('audit failed'));
    await expect(service.confirm('u', '123456')).rejects.toThrow(
      'audit failed',
    );
  });
});
