/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/profile-wall-interaction.policy.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Profile Wall interaction ownership and privacy enforcement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserWallRepository } from '../../domain/repositories/user-wall.repository.interface';
import type { UserBlockService } from './user-block.service';
import { ProfileWallInteractionPolicy } from './profile-wall-interaction.policy';
import type { UserPrivacyService } from './user-privacy.service';

describe('ProfileWallInteractionPolicy', () => {
  const target = {
    interactionTargetId: 'target-1',
    postId: 'post-1',
    viewerId: 'viewer-1',
  };
  const post = {
    id: 'post-1',
    interactionTargetId: 'target-1',
    profileOwnerId: 'owner-1',
    authorId: 'author-1',
    body: 'Hello',
    imageMediaId: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('allows a visible, unblocked profile using minimal owner coordinates', async () => {
    const wall = {
      findById: jest.fn().mockResolvedValue(post),
    } as unknown as jest.Mocked<UserWallRepository>;
    const privacy = {
      visibilityFor: jest
        .fn()
        .mockResolvedValue({ profileVisibility: 'PUBLIC' }),
    } as unknown as jest.Mocked<UserPrivacyService>;
    const blocks = {
      isBlocked: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<UserBlockService>;
    const policy = new ProfileWallInteractionPolicy(wall, privacy, blocks);
    await expect(policy.authorize(target)).resolves.toEqual({ allowed: true });
  });

  it('denies blocked, private, or mismatched owner coordinates', async () => {
    const wall = {
      findById: jest.fn().mockResolvedValue(post),
    } as unknown as jest.Mocked<UserWallRepository>;
    const privacy = {
      visibilityFor: jest
        .fn()
        .mockResolvedValue({ profileVisibility: 'PRIVATE' }),
    } as unknown as jest.Mocked<UserPrivacyService>;
    const blocks = {
      isBlocked: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<UserBlockService>;
    const policy = new ProfileWallInteractionPolicy(wall, privacy, blocks);

    await expect(policy.authorize(target)).resolves.toMatchObject({
      allowed: false,
      reason: 'PROFILE_PRIVATE',
    });
    blocks.isBlocked.mockResolvedValue(true);
    await expect(policy.authorize(target)).resolves.toMatchObject({
      allowed: false,
      reason: 'PROFILE_BLOCKED',
    });
    wall.findById.mockResolvedValue({
      ...post,
      interactionTargetId: 'another-target',
    });
    await expect(policy.authorize(target)).resolves.toMatchObject({
      allowed: false,
      reason: 'OWNER_RECORD_UNAVAILABLE',
    });
  });
});

/**
 * Privacy remains an owner concern, even when the feature is shared.
 */
