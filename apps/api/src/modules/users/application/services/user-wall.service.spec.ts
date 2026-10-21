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
import type { WallImageEligibility } from '../../domain/ports/wall-image-eligibility.interface';

describe('UserWallService', () => {
  const wall = {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
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
  const images: jest.Mocked<WallImageEligibility> = {
    isAttachableImage: jest.fn(),
  };
  const service = new UserWallService(wall, users, privacy, blocks, images);

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
    images.isAttachableImage.mockResolvedValue(true);
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
    images.isAttachableImage.mockResolvedValue(false);

    await expect(
      service.create('author', 'owner', null, 'media-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an image post after the owned port validates Media ownership', async () => {
    images.isAttachableImage.mockResolvedValue(true);
    wall.create.mockResolvedValue({
      id: 'post-image',
      interactionTargetId: 'target-image',
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
      interactionTargetId: 'target-1',
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
      interactionTargetId: 'target-1',
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

  it('does not query image evidence when posting is private', async () => {
    privacy.visibilityFor.mockResolvedValue({
      ...publicSettings,
      allowWallPosts: false,
    });
    await expect(
      service.create('author', 'owner', null, 'media'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(images.isAttachableImage.mock.calls).toHaveLength(0);
    expect(wall.create.mock.calls).toHaveLength(0);
  });

  it('does not query image evidence for blocked users', async () => {
    blocks.isBlocked.mockResolvedValue(true);
    await expect(
      service.create('author', 'owner', null, 'media'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(images.isAttachableImage.mock.calls).toHaveLength(0);
    expect(wall.create.mock.calls).toHaveLength(0);
  });

  it('propagates image provider errors before any post write', async () => {
    images.isAttachableImage.mockRejectedValue(new Error('Media unavailable'));
    await expect(
      service.create('author', 'owner', null, 'media'),
    ).rejects.toThrow('Media unavailable');
    expect(wall.create.mock.calls).toHaveLength(0);
  });
});

/**
 * Tests are the polite neighbor who checks that nobody writes on a private
 * wall without permission.
 */
