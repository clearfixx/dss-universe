/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Tests
 * 📄 File: apps/api/src/modules/users/application/services/user-privacy.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies privacy defaults, owner bypass, and private-profile enforcement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserPrivacyRepository } from '../../domain/repositories/user-privacy.repository.interface';
import {
  DEFAULT_USER_PRIVACY_SETTINGS,
  UserPrivacyService,
} from './user-privacy.service';

describe('UserPrivacyService', () => {
  const findByUserId: jest.MockedFunction<
    UserPrivacyRepository['findByUserId']
  > = jest.fn();
  const upsert: jest.MockedFunction<UserPrivacyRepository['upsert']> =
    jest.fn();
  const repository: jest.Mocked<UserPrivacyRepository> = {
    findByUserId,
    findManyByUserIds: jest.fn(),
    upsert,
  };
  const service = new UserPrivacyService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('uses privacy-safe defaults before the owner saves settings', async () => {
    findByUserId.mockResolvedValue(null);

    await expect(service.get('user-1')).resolves.toEqual({
      userId: 'user-1',
      ...DEFAULT_USER_PRIVACY_SETTINGS,
    });
  });

  it.each(['PUBLIC', 'MEMBERS', 'PRIVATE'] as const)(
    'keeps batched %s policy identical to single reads for owner, member and guest',
    async (profileVisibility) => {
      const policy = {
        userId: 'user-1',
        ...DEFAULT_USER_PRIVACY_SETTINGS,
        profileVisibility,
        showLocation: false,
        showWebsite: false,
        showLastSeen: false,
      };
      repository.findManyByUserIds.mockResolvedValue([policy]);
      findByUserId.mockResolvedValue(policy);
      for (const viewer of ['user-1', 'other', undefined]) {
        const batch = await service.visibilityForMany(
          ['user-1', 'user-1'],
          viewer,
        );
        expect(batch.get('user-1')).toEqual(
          await service.visibilityFor('user-1', viewer),
        );
        expect(batch.size).toBe(1);
      }
      expect(repository.findManyByUserIds.mock.calls).toEqual([
        [['user-1']],
        [['user-1']],
        [['user-1']],
      ]);
    },
  );

  it('does not read empty batches or swallow batch privacy failures', async () => {
    await expect(service.visibilityForMany([], 'viewer')).resolves.toEqual(
      new Map(),
    );
    expect(repository.findManyByUserIds.mock.calls).toHaveLength(0);
    repository.findManyByUserIds.mockRejectedValueOnce(
      new Error('privacy unavailable'),
    );
    await expect(
      service.visibilityForMany(['user-1'], 'viewer'),
    ).rejects.toThrow('privacy unavailable');
  });

  it('fills missing records with defaults in batched privacy reads', async () => {
    repository.findManyByUserIds.mockResolvedValue([]);

    const result = await service.getMany(['user-1', 'user-1', 'user-2']);

    expect(repository.findManyByUserIds.mock.calls).toContainEqual([
      ['user-1', 'user-2'],
    ]);
    expect(result.get('user-2')).toEqual({
      userId: 'user-2',
      ...DEFAULT_USER_PRIVACY_SETTINGS,
    });
  });

  it('always grants the owner visibility to their own fields', async () => {
    findByUserId.mockResolvedValue({
      userId: 'user-1',
      profileVisibility: 'PRIVATE',
      showLocation: false,
      showWebsite: false,
      showSocialLinks: false,
      showLastSeen: false,
      showOnlineStatus: false,
      allowFollowers: true,
      showFollows: false,
      allowWallPosts: false,
    });

    await expect(service.visibilityFor('user-1', 'user-1')).resolves.toEqual(
      expect.objectContaining({
        showLocation: true,
        showWebsite: true,
        showSocialLinks: true,
        showLastSeen: true,
        showOnlineStatus: true,
        allowFollowers: true,
        showFollows: true,
      }),
    );
  });

  it('hides all extended fields on a private profile', async () => {
    findByUserId.mockResolvedValue({
      userId: 'user-1',
      profileVisibility: 'PRIVATE',
      showLocation: true,
      showWebsite: true,
      showSocialLinks: true,
      showLastSeen: true,
      showOnlineStatus: true,
      allowFollowers: true,
      showFollows: true,
      allowWallPosts: true,
    });

    await expect(service.visibilityFor('user-1', 'user-2')).resolves.toEqual(
      expect.objectContaining({
        showLocation: false,
        showWebsite: false,
        showSocialLinks: false,
        showLastSeen: false,
        showOnlineStatus: false,
        showFollows: false,
      }),
    );
  });

  it('treats an anonymous visitor as outside a members-only profile', async () => {
    findByUserId.mockResolvedValue({
      userId: 'user-1',
      profileVisibility: 'MEMBERS',
      showLocation: true,
      showWebsite: true,
      showSocialLinks: true,
      showLastSeen: true,
      showOnlineStatus: true,
      allowFollowers: true,
      showFollows: true,
      allowWallPosts: true,
    });

    await expect(service.visibilityFor('user-1')).resolves.toEqual(
      expect.objectContaining({
        showLocation: false,
        showWebsite: false,
        showSocialLinks: false,
        showLastSeen: false,
        showOnlineStatus: false,
        showFollows: false,
      }),
    );
  });
});
