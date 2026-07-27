/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-activity-feed.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies privacy and block enforcement for user activity.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ForbiddenException } from '@nestjs/common';

import type { ActivityFeedService } from '../../../activity';

import type { UserBlockService } from './user-block.service';
import type { UserPrivacyService } from './user-privacy.service';
import { UserActivityFeedService } from './user-activity-feed.service';
import type { UsersService } from './users.service';

describe('UserActivityFeedService', () => {
  const activity = {
    byActor: jest.fn(),
  } as unknown as jest.Mocked<ActivityFeedService>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const privacy = {
    visibilityFor: jest.fn(),
  } as unknown as jest.Mocked<UserPrivacyService>;
  const blocks = {
    isBlocked: jest.fn(),
  } as unknown as jest.Mocked<UserBlockService>;
  const service = new UserActivityFeedService(activity, users, privacy, blocks);

  beforeEach(() => {
    jest.clearAllMocks();
    users.exists.mockResolvedValue(true);
    blocks.isBlocked.mockResolvedValue(false);
    privacy.visibilityFor.mockResolvedValue({
      userId: 'owner',
      profileVisibility: 'PUBLIC',
      showLocation: true,
      showWebsite: true,
      showSocialLinks: true,
      showLastSeen: false,
      showOnlineStatus: true,
      allowFollowers: true,
      showFollows: true,
      allowWallPosts: true,
    });
    activity.byActor.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('delegates a visible profile to the shared projection', async () => {
    await service.list('viewer', 'owner', 2, 10);

    expect(activity.byActor.mock.calls).toContainEqual(['owner', 2, 10]);
  });

  it('denies another viewer when the profile is private', async () => {
    privacy.visibilityFor.mockResolvedValue({
      userId: 'owner',
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

    await expect(service.list('viewer', 'owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(activity.byActor.mock.calls).toHaveLength(0);
  });

  it('denies activity across a block boundary', async () => {
    blocks.isBlocked.mockResolvedValue(true);

    await expect(service.list('viewer', 'owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(privacy.visibilityFor.mock.calls).toHaveLength(0);
  });
});

/**
 * A timeline is not a loophole around a private profile.
 */
