/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Tests
 * 📄 File: apps/api/src/modules/users/application/services/user-social-graph.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies follow safety, privacy enforcement, and summary behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserSocialGraphRepository } from '../../domain/repositories/user-social-graph.repository.interface';
import type { UserPrivacyService } from './user-privacy.service';
import { UserSocialGraphService } from './user-social-graph.service';
import type { UsersService } from './users.service';
import type { UserBlockService } from './user-block.service';

describe('UserSocialGraphService', () => {
  const follow: jest.MockedFunction<UserSocialGraphRepository['follow']> =
    jest.fn();
  const unfollow: jest.MockedFunction<UserSocialGraphRepository['unfollow']> =
    jest.fn();
  const summaries: jest.MockedFunction<UserSocialGraphRepository['summaries']> =
    jest.fn();
  const graph = {
    follow,
    unfollow,
    summaries,
  } as unknown as jest.Mocked<UserSocialGraphRepository>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const privacy = {
    get: jest.fn(),
    visibilityFor: jest.fn(),
  } as unknown as jest.Mocked<UserPrivacyService>;
  const blocks = {
    isBlocked: jest.fn().mockResolvedValue(false),
  } as unknown as jest.Mocked<UserBlockService>;
  const service = new UserSocialGraphService(graph, users, privacy, blocks);

  beforeEach(() => jest.clearAllMocks());

  it('rejects self-follow without touching persistence', async () => {
    await expect(service.follow('user-1', 'user-1')).rejects.toMatchObject({
      status: 400,
    });
    expect(follow).not.toHaveBeenCalled();
  });

  it('enforces the target allow-followers policy', async () => {
    users.exists.mockResolvedValue(true);
    blocks.isBlocked.mockResolvedValue(false);
    privacy.get.mockResolvedValue({
      userId: 'user-2',
      profileVisibility: 'PUBLIC',
      showLocation: true,
      showWebsite: true,
      showSocialLinks: true,
      showLastSeen: false,
      showOnlineStatus: true,
      allowFollowers: false,
      showFollows: true,
      allowWallPosts: true,
    });

    await expect(service.follow('user-1', 'user-2')).rejects.toMatchObject({
      status: 403,
    });
    expect(follow).not.toHaveBeenCalled();
  });

  it('creates a follow and returns the updated target summary', async () => {
    users.exists.mockResolvedValue(true);
    blocks.isBlocked.mockResolvedValue(false);
    privacy.get.mockResolvedValue({
      userId: 'user-2',
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
    summaries.mockResolvedValue(
      new Map([
        ['user-2', { userId: 'user-2', followerCount: 1, followingCount: 0 }],
      ]),
    );

    await expect(service.follow('user-1', 'user-2')).resolves.toEqual({
      userId: 'user-2',
      followerCount: 1,
      followingCount: 0,
    });
    expect(follow).toHaveBeenCalledWith('user-1', 'user-2');
  });
});
