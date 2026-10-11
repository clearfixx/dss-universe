/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/legacy-access-token-issuer.spec.ts
 *
 * 🎯 Purpose:
 * Verifies exact legacy JWT claims and failure-closed owner composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PermissionsService } from '@api/core/authorization';
import type { ProfileDisplayReader } from '@api/modules/users';
import { LegacyAccessTokenIssuer } from './legacy-access-token-issuer';

describe('LegacyAccessTokenIssuer', () => {
  const subject = { id: 'subject-1', email: 'auth@dss.test', authVersion: 7 };
  const signAsync = jest.fn<Promise<string>, [unknown, unknown]>();
  const get = jest.fn<string | undefined, [string]>();
  const permissions = { getAccessProfileByUserId: jest.fn() } as jest.Mocked<
    Pick<PermissionsService, 'getAccessProfileByUserId'>
  >;
  const profiles: jest.Mocked<ProfileDisplayReader> = {
    findUsername: jest.fn(),
  };
  const issuer = new LegacyAccessTokenIssuer(
    { signAsync } as unknown as JwtService,
    { get } as unknown as ConfigService,
    permissions as unknown as PermissionsService,
    profiles,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    get.mockReturnValue('synthetic-access-secret');
    signAsync.mockResolvedValue('signed-access');
    profiles.findUsername.mockResolvedValue('explorer');
    permissions.getAccessProfileByUserId.mockResolvedValue({
      roles: ['user'],
      permissions: ['profile.read'],
    });
  });

  it('assembles only legacy claims while retaining Auth identity and version', async () => {
    const runtimeSubject = {
      ...subject,
      passwordHash: 'never-copy',
      username: 'untrusted',
    };
    const result = await issuer.issue(runtimeSubject, 'session-1');
    expect(result).toBe('signed-access');
    expect(signAsync.mock.calls).toEqual([
      [
        {
          sub: 'subject-1',
          email: 'auth@dss.test',
          ver: 7,
          sid: 'session-1',
          username: 'explorer',
          roles: ['user'],
          permissions: ['profile.read'],
        },
        { secret: 'synthetic-access-secret', expiresIn: '15m' },
      ],
    ]);
    expect(profiles.findUsername.mock.calls).toEqual([['subject-1']]);
    expect(permissions.getAccessProfileByUserId.mock.calls).toEqual([
      ['subject-1'],
    ]);
  });

  it('refuses to sign when the display profile is missing', async () => {
    profiles.findUsername.mockResolvedValue(null);
    await expect(issuer.issue(subject, 'session-1')).rejects.toThrow(
      'Token display identity is unavailable.',
    );
    expect(signAsync.mock.calls).toHaveLength(0);
  });

  it.each(['profile', 'permissions'] as const)(
    'propagates %s authority failure without signing',
    async (owner) => {
      const failure = new Error('owner unavailable');
      if (owner === 'profile') profiles.findUsername.mockRejectedValue(failure);
      else permissions.getAccessProfileByUserId.mockRejectedValue(failure);
      await expect(issuer.issue(subject, 'session-1')).rejects.toBe(failure);
      expect(signAsync.mock.calls).toHaveLength(0);
    },
  );

  it('refuses to consult owners or sign without access signing configuration', async () => {
    get.mockReturnValue(undefined);
    await expect(issuer.issue(subject, 'session-1')).rejects.toThrow(
      'JWT_ACCESS_SECRET is not configured.',
    );
    expect(signAsync.mock.calls).toHaveLength(0);
    expect(profiles.findUsername.mock.calls).toHaveLength(0);
    expect(permissions.getAccessProfileByUserId.mock.calls).toHaveLength(0);
  });
});
