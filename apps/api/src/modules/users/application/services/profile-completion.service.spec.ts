/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/profile-completion.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies deterministic profile completion calculation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import type { UserSocialLinksService } from './user-social-links.service';
import type { UsersService } from './users.service';
import { ProfileCompletionService } from './profile-completion.service';

describe('ProfileCompletionService', () => {
  const users = {
    getById: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const socialLinks = {
    getManyByUserIds: jest.fn(),
  } as unknown as jest.Mocked<UserSocialLinksService>;
  const service = new ProfileCompletionService(users, socialLinks);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the missing checklist for a new profile', async () => {
    users.getById.mockResolvedValue({
      id: 'user-1',
      email: 'astronaut@dss.test',
      username: 'astronaut',
      displayName: 'Astronaut',
      bio: null,
      location: null,
      website: null,
      technologies: [],
      interests: [],
      avatarUrl: null,
      coverUrl: null,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    socialLinks.getManyByUserIds.mockResolvedValue(new Map());

    await expect(service.getForUser('user-1')).resolves.toEqual({
      percentage: 0,
      completedCount: 0,
      totalCount: 8,
      isComplete: false,
      completedFields: [],
      missingFields: [
        'AVATAR',
        'COVER',
        'BIO',
        'LOCATION',
        'WEBSITE',
        'TECHNOLOGIES',
        'INTERESTS',
        'SOCIAL_LINKS',
      ],
    });
  });

  it('calculates completion from canonical profile and social-link data', async () => {
    users.getById.mockResolvedValue({
      id: 'user-1',
      email: 'astronaut@dss.test',
      username: 'astronaut',
      displayName: 'Astronaut',
      bio: 'Building a universe',
      location: 'Kyiv',
      website: 'https://dss.example',
      technologies: ['TypeScript'],
      interests: ['Space'],
      avatarUrl: '/media/avatar',
      coverUrl: null,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    socialLinks.getManyByUserIds.mockResolvedValue(
      new Map([
        [
          'user-1',
          [
            {
              id: 'link-1',
              userId: 'user-1',
              platform: 'github',
              label: null,
              url: 'https://github.com/astronaut',
              position: 0,
            },
          ],
        ],
      ]),
    );

    await expect(service.getForUser('user-1')).resolves.toEqual({
      percentage: 88,
      completedCount: 7,
      totalCount: 8,
      isComplete: false,
      completedFields: [
        'AVATAR',
        'BIO',
        'LOCATION',
        'WEBSITE',
        'TECHNOLOGIES',
        'INTERESTS',
        'SOCIAL_LINKS',
      ],
      missingFields: ['COVER'],
    });
    expect(users.getById.mock.calls).toContainEqual(['user-1']);
    expect(socialLinks.getManyByUserIds.mock.calls).toContainEqual([
      ['user-1'],
    ]);
  });
});

/**
 * Eight honest checks beat one suspiciously optimistic progress bar.
 */
