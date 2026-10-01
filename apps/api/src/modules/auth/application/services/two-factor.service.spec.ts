import { BadRequestException } from '@nestjs/common';

import { TwoFactorRequiredException } from '../../domain/exceptions/two-factor-required.exception';
import type { PasswordHashService } from './password-hash.service';
import type { TotpService } from './totp.service';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorService', () => {
  const findUnique = jest.fn();
  const upsert = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const updateMany = jest.fn();
  const userUpdate = jest.fn();
  const queryRaw = jest.fn();
  const append = jest.fn();
  const compare = jest.fn();
  const createSecret = jest.fn(() => 'BASE32SECRET');
  const encrypt = jest.fn(() => 'encrypted-secret');
  const decrypt = jest.fn(() => 'BASE32SECRET');
  const verify = jest.fn();
  const recoveryCode = jest.fn();
  const recoveryHash = jest.fn((code: string) => `hash:${code.toLowerCase()}`);
  const tx = {
    $queryRaw: queryRaw,
    userTwoFactor: { findUnique, upsert, update, delete: remove },
    session: { updateMany },
    user: { update: userUpdate },
  };
  const prisma = {
    userTwoFactor: { findUnique, upsert },
    user: { findUnique },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) =>
      Promise.resolve(run(tx)),
    ),
  };
  const service = new TwoFactorService(
    prisma as never,
    { append } as never,
    { compare } as unknown as PasswordHashService,
    {
      createSecret,
      encrypt,
      decrypt,
      verify,
      recoveryCode,
      recoveryHash,
    } as unknown as TotpService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    recoveryCode.mockImplementation(
      () => `code-${recoveryCode.mock.calls.length}`,
    );
  });

  it('creates pending setup but refuses to replace enabled credentials', async () => {
    findUnique.mockResolvedValueOnce(null);
    const setup = await service.begin('user-1', 'dev@example.test');
    expect(setup.secret).toBe('BASE32SECRET');
    expect(setup.otpauthUri).toContain('DSS%20Universe%3Adev%40example.test');
    expect(JSON.stringify(upsert.mock.calls)).toContain(
      '"encryptedSecret":"encrypted-secret"',
    );

    findUnique.mockResolvedValueOnce({ enabledAt: new Date() });
    await expect(
      service.begin('user-1', 'dev@example.test'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms setup under a row lock and stores only recovery hashes', async () => {
    findUnique.mockResolvedValue({
      userId: 'user-1',
      encryptedSecret: 'encrypted-secret',
      enabledAt: null,
      recoveryCodeHashes: [],
    });
    verify.mockReturnValue(true);

    const result = await service.confirm('user-1', '123456');

    expect(queryRaw).toHaveBeenCalled();
    expect(result.recoveryCodes).toHaveLength(10);
    for (const code of result.recoveryCodes) {
      expect(JSON.stringify(update.mock.calls)).toContain(`hash:${code}`);
    }
    expect(JSON.stringify(update.mock.calls)).not.toContain('BASE32SECRET');
  });

  it('requires a second factor when enabled and accepts a valid TOTP', async () => {
    findUnique.mockResolvedValue({
      encryptedSecret: 'encrypted-secret',
      enabledAt: new Date(),
      recoveryCodeHashes: [],
    });
    await expect(service.assertLogin('user-1')).rejects.toBeInstanceOf(
      TwoFactorRequiredException,
    );
    verify.mockReturnValue(true);
    await expect(
      service.assertLogin('user-1', '123456'),
    ).resolves.toBeUndefined();
  });

  it('consumes a recovery code once while holding a row lock', async () => {
    findUnique.mockResolvedValue({
      encryptedSecret: 'encrypted-secret',
      enabledAt: new Date(),
      recoveryCodeHashes: ['hash:abcdef-123456'],
    });
    verify.mockReturnValue(false);

    await expect(
      service.assertLogin('user-1', 'ABCDEF-123456'),
    ).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { recoveryCodeHashes: [] } }),
    );
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'auth.two-factor.recovery-code-used' }),
    );
  });

  it('requires password and second factor before disabling and revokes sessions', async () => {
    findUnique
      .mockResolvedValueOnce({ id: 'user-1', passwordHash: 'password-hash' })
      .mockResolvedValue({
        encryptedSecret: 'encrypted-secret',
        enabledAt: new Date(),
        recoveryCodeHashes: [],
      });
    compare.mockResolvedValue(true);
    verify.mockReturnValue(true);

    await expect(
      service.disable('user-1', 'correct-password', '123456'),
    ).resolves.toEqual({ success: true });
    expect(remove).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { authVersion: { increment: 1 } } }),
    );
  });
});
