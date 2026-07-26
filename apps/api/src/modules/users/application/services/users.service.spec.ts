/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/users.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies safe mapping, pagination and missing-user behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import type { UsersRepository } from '../../domain/repositories/users.repository.interface';
import type { UserRecord } from '../../domain/types/user-record.type';
import { UsersService } from './users.service';
import type { UserPrivacyService } from './user-privacy.service';

const user: UserRecord = {
  id: 'user-1',
  email: 'astronaut@dss.test',
  username: 'astronaut',
  passwordHash: 'secret-password-hash',
  displayName: 'Astronaut',
  bio: 'Exploring DSS Universe',
  location: null,
  website: null,
  technologies: [],
  interests: [],
  avatarUrl: null,
  coverUrl: null,
  status: UserStatus.ACTIVE,
  refreshTokenHash: 'secret-refresh-hash',
  emailVerifiedAt: new Date('2026-01-02T00:00:00.000Z'),
  lastSeenAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('UsersService', () => {
  const usersRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const privacy = {
    visibilityFor: jest.fn(),
  } as unknown as jest.Mocked<UserPrivacyService>;
  const service = new UsersService(usersRepository, privacy);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps paginated records to public DTOs without secrets', async () => {
    usersRepository.findMany.mockResolvedValue({
      items: [user],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await service.list();

    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(result.items[0]).not.toHaveProperty('refreshTokenHash');
    expect(result.items[0].emailVerifiedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(result.total).toBe(1);
  });

  it('throws the Users domain exception for a missing user', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it('delegates profile updates through the repository boundary', async () => {
    usersRepository.updateById.mockResolvedValue({
      ...user,
      displayName: 'Commander',
    });

    const result = await service.updateProfile(user.id, {
      displayName: '  Commander  ',
      bio: user.bio,
      location: '  Kyiv, Ukraine ',
      website: ' https://dss.example ',
      technologies: [' TypeScript ', 'typescript', 'NestJS'],
      interests: [' Space '],
    });

    expect(usersRepository.updateById.mock.calls).toContainEqual([
      user.id,
      {
        displayName: 'Commander',
        bio: user.bio,
        location: 'Kyiv, Ukraine',
        website: 'https://dss.example',
        technologies: ['typescript', 'NestJS'],
        interests: ['Space'],
      },
    ]);
    expect(result.displayName).toBe('Commander');
  });

  it('redacts a private profile for another viewer', async () => {
    usersRepository.findPublicByUsername = jest.fn().mockResolvedValue({
      ...user,
      location: 'Kyiv',
      website: 'https://dss.example',
      technologies: ['TypeScript'],
      interests: ['Space'],
      lastSeenAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    privacy.visibilityFor.mockResolvedValue({
      userId: user.id,
      profileVisibility: 'PRIVATE',
      showLocation: false,
      showWebsite: false,
      showSocialLinks: false,
      showLastSeen: false,
      showOnlineStatus: false,
      allowFollowers: true,
      showFollows: true,
    });

    const result = await service.getPublicByUsername(user.username, 'viewer-2');

    expect(result).toMatchObject({
      bio: null,
      location: null,
      website: null,
      technologies: [],
      interests: [],
      lastSeenAt: null,
    });
  });
});
