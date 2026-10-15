/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/mappers/user.mapper.spec.ts
 *
 * 🎯 Purpose:
 * Verifies that only the explicit safe profile contract can leave persistence.
 *
 * 🧠 Responsibilities:
 * • characterizes all supported profile fields;
 * • rejects current and future authentication-state leakage.
 *
 * 🏗️ Architecture:
 * Domain mapper regression tests, independent of database and transport.
 *
 * ⚠️ Important:
 * Structural TypeScript typing does not remove extra runtime object properties.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import type { SafeUser } from '../types/safe-user.type';
import type { UserRecord } from '../types/user-record.type';
import { UserMapper } from './user.mapper';

const profile: SafeUser = {
  id: 'subject-1',
  email: 'explorer@dss.test',
  username: 'explorer',
  displayName: 'Explorer',
  bio: 'Learning together',
  location: 'Kyiv',
  website: 'https://example.test',
  technologies: ['TypeScript'],
  interests: ['Architecture'],
  avatarUrl: '/avatar.png',
  coverUrl: '/cover.png',
  status: UserStatus.ACTIVE,
  emailVerifiedAt: new Date('2026-10-01T00:00:00Z'),
  lastSeenAt: new Date('2026-10-10T00:00:00Z'),
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-10-10T00:00:00Z'),
};

const record: UserRecord & {
  passwordHash: string;
  refreshTokenHash: string;
  authVersion: number;
  deactivatedAt: Date | null;
  loginFailedAttempts: number;
  loginLockedUntil: Date;
} = {
  ...profile,
  passwordHash: 'private-password-hash',
  refreshTokenHash: 'private-refresh-hash',
  authVersion: 7,
  deactivatedAt: null,
  loginFailedAttempts: 3,
  loginLockedUntil: new Date('2026-10-11T00:00:00Z'),
};

describe('UserMapper safe profile allowlist', () => {
  it('returns exactly the declared profile fields, not internal account state', () => {
    expect(UserMapper.toSafeUser(record)).toEqual(profile);
  });

  it('does not copy future credential fields present on the runtime record', () => {
    const extended = {
      ...record,
      recoverySecret: 'private-recovery-secret',
      providerCredential: 'private-provider-credential',
    };

    expect(UserMapper.toSafeUser(extended)).toEqual(profile);
  });

  it('preserves nullable profile values without inventing defaults', () => {
    const nullable = {
      ...record,
      displayName: null,
      bio: null,
      location: null,
      website: null,
      avatarUrl: null,
      coverUrl: null,
      emailVerifiedAt: null,
      lastSeenAt: null,
    };
    const result = UserMapper.toSafeUser(nullable);

    expect(Object.keys(result).sort()).toEqual(Object.keys(profile).sort());
    expect(result).toMatchObject({
      displayName: null,
      bio: null,
      location: null,
      website: null,
      avatarUrl: null,
      coverUrl: null,
      emailVerifiedAt: null,
      lastSeenAt: null,
    });
  });
});
