/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-wall.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Profile Wall content, privacy, media and tombstone policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { UserWallRepository } from '../../domain/repositories/user-wall.repository.interface';
import type { UserBlockService } from './user-block.service';
import type { UserPrivacyService } from './user-privacy.service';
import { UserWallService } from './user-wall.service';
import type { UsersService } from './users.service';

describe('UserWallService', () => {
  const wall = {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    isAttachableImage: jest.fn(),
    tombstone: jest.fn(),
  } as jest.Mocked<UserWallRepository>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const privacy = {
    visibilityFor: jest.fn(),
  } as unknown as jest.Mocked<UserPrivacyService>;
  const blocks = {
    isBlocked: jest.fn(),
  } as unknown as jest.Mocked<UserBlockService>;
  const service = new UserWallService(wall, users, privacy, blocks);

  const publicSettings = {
    userId: 'owner',
    profileVisibility: 'PUBLIC' as const,
    showLocation: true,
    showWebsite: true,
    showSocialLinks: true,
    showLastSeen: false,
    showOnlineStatus: true,
    allowFollowers: true,
    showFollows: true,
    allowWallPosts: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users.exists.mockResolvedValue(true);
    blocks.isBlocked.mockResolvedValue(false);
    privacy.visibilityFor.mockResolvedValue(publicSettings);
  });

  it('requires text or an image', async () => {
    await expect(
      service.create('author', 'owner', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents posting when the profile owner disables wall posts', async () => {
    privacy.visibilityFor.mockResolvedValue({
      ...publicSettings,
      allowWallPosts: false,
    });

    await expect(
      service.create('author', 'owner', 'Hello'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts only a READY image owned by the author', async () => {
    wall.isAttachableImage.mockResolvedValue(false);

    await expect(
      service.create('author', 'owner', null, 'media-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an image post after the repository validates Media ownership', async () => {
    wall.isAttachableImage.mockResolvedValue(true);
    wall.create.mockResolvedValue({
      id: 'post-image',
      profileOwnerId: 'owner',
      authorId: 'author',
      body: null,
      imageMediaId: 'media-id',
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('author', 'owner', null, 'media-id');

    expect(wall.create.mock.calls).toContainEqual([
      {
        profileOwnerId: 'owner',
        authorId: 'author',
        body: null,
        imageMediaId: 'media-id',
      },
    ]);
  });

  it('allows the profile owner to tombstone a visitor post', async () => {
    wall.findById.mockResolvedValue({
      id: 'post-1',
      profileOwnerId: 'owner',
      authorId: 'author',
      body: 'Hello',
      imageMediaId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    wall.tombstone.mockResolvedValue({
      id: 'post-1',
      profileOwnerId: 'owner',
      authorId: 'author',
      body: null,
      imageMediaId: null,
      isDeleted: true,
      deletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.remove('owner', 'post-1', 'Off topic');

    expect(result.isDeleted).toBe(true);
    expect(wall.tombstone.mock.calls).toContainEqual([
      'post-1',
      'owner',
      'Off topic',
    ]);
  });
});

/**
 * Tests are the polite neighbor who checks that nobody writes on a private
 * wall without permission.
 */
