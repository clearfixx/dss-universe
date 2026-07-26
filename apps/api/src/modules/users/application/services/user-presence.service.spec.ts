/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-presence.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies TTL presence, last-seen throttling and online-status privacy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type IORedis from 'ioredis';

import type { UsersRepository } from '../../domain/repositories/users.repository.interface';
import type { UserPrivacyService } from './user-privacy.service';
import { UserPresenceService } from './user-presence.service';

describe('UserPresenceService', () => {
  const redis = {
    zadd: jest.fn(),
    set: jest.fn(),
    zremrangebyscore: jest.fn(),
    zmscore: jest.fn(),
    zrangebyscore: jest.fn(),
  };
  const users = {
    updateById: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const privacy = {
    getMany: jest.fn(),
  } as unknown as jest.Mocked<UserPrivacyService>;
  const service = new UserPresenceService(
    redis as unknown as IORedis,
    users,
    privacy,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.zadd.mockResolvedValue(1);
    redis.zremrangebyscore.mockResolvedValue(0);
  });

  it('refreshes TTL presence and throttles durable last-seen writes', async () => {
    redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    users.updateById.mockResolvedValue({} as never);

    await service.touch('user-1');
    await service.touch('user-1');

    expect(redis.zadd).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledWith(
      'dss:presence:last-seen:user-1',
      expect.any(String),
      'EX',
      300,
      'NX',
    );
    expect(users.updateById.mock.calls).toHaveLength(1);
  });

  it('redacts online state when profile privacy hides it', async () => {
    redis.zmscore.mockResolvedValue(['1785073000000', '1785073000000']);
    privacy.getMany.mockResolvedValue(
      new Map([
        [
          'visible',
          {
            userId: 'visible',
            profileVisibility: 'PUBLIC',
            showLocation: true,
            showWebsite: true,
            showSocialLinks: true,
            showLastSeen: false,
            showOnlineStatus: true,
            allowFollowers: true,
            showFollows: true,
            allowWallPosts: true,
          },
        ],
        [
          'hidden',
          {
            userId: 'hidden',
            profileVisibility: 'PUBLIC',
            showLocation: true,
            showWebsite: true,
            showSocialLinks: true,
            showLastSeen: false,
            showOnlineStatus: false,
            allowFollowers: true,
            showFollows: true,
            allowWallPosts: true,
          },
        ],
      ]),
    );

    await expect(
      service.visibleStatuses(['visible', 'hidden'], 'viewer'),
    ).resolves.toEqual(
      new Map([
        ['visible', true],
        ['hidden', false],
      ]),
    );
  });

  it('always exposes the viewer own online state', async () => {
    redis.zmscore.mockResolvedValue(['1785073000000']);
    privacy.getMany.mockResolvedValue(
      new Map([
        [
          'viewer',
          {
            userId: 'viewer',
            profileVisibility: 'PRIVATE',
            showLocation: false,
            showWebsite: false,
            showSocialLinks: false,
            showLastSeen: false,
            showOnlineStatus: false,
            allowFollowers: false,
            showFollows: false,
            allowWallPosts: false,
          },
        ],
      ]),
    );

    await expect(
      service.visibleStatuses(['viewer'], 'viewer'),
    ).resolves.toEqual(new Map([['viewer', true]]));
  });

  it('returns only privacy-visible users for online-only directory filters', async () => {
    redis.zrangebyscore.mockResolvedValue(['visible', 'hidden']);
    redis.zmscore.mockResolvedValue(['1785073000000', '1785073000000']);
    privacy.getMany.mockResolvedValue(
      new Map([
        [
          'visible',
          {
            userId: 'visible',
            profileVisibility: 'PUBLIC',
            showLocation: true,
            showWebsite: true,
            showSocialLinks: true,
            showLastSeen: false,
            showOnlineStatus: true,
            allowFollowers: true,
            showFollows: true,
            allowWallPosts: true,
          },
        ],
        [
          'hidden',
          {
            userId: 'hidden',
            profileVisibility: 'PRIVATE',
            showLocation: false,
            showWebsite: false,
            showSocialLinks: false,
            showLastSeen: false,
            showOnlineStatus: false,
            allowFollowers: false,
            showFollows: false,
            allowWallPosts: false,
          },
        ],
      ]),
    );

    await expect(service.visibleOnlineUserIds('viewer')).resolves.toEqual([
      'visible',
    ]);
  });
});
