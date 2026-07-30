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

import { InteractionPolicyRegistryService } from '../../../interactions';
import type { UserWallRepository } from '../../domain/repositories/user-wall.repository.interface';
import type { UserBlockService } from './user-block.service';
import {
  ProfileWallInteractionPolicy,
  PROFILE_WALL_INTERACTION_KIND,
} from './profile-wall-interaction.policy';
import type { UserPrivacyService } from './user-privacy.service';

describe('ProfileWallInteractionPolicy', () => {
  const target = {
    id: 'target-1',
    kind: PROFILE_WALL_INTERACTION_KIND,
    ownerModule: 'users',
    ownerType: 'UserWallPost',
    ownerId: 'post-1',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  it('registers ownership and allows a visible, unblocked profile', async () => {
    const registry = new InteractionPolicyRegistryService();
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
    const policy = new ProfileWallInteractionPolicy(
      registry,
      wall,
      privacy,
      blocks,
    );
    policy.onModuleInit();

    await expect(
      registry.authorize(target, 'viewer-1', 'COMMENT'),
    ).resolves.toEqual({ allowed: true });
    policy.onModuleDestroy();
    await expect(
      registry.authorize(target, 'viewer-1', 'COMMENT'),
    ).resolves.toMatchObject({ allowed: false });
  });

  it('denies blocked, private, or mismatched owner coordinates', async () => {
    const registry = new InteractionPolicyRegistryService();
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
    const policy = new ProfileWallInteractionPolicy(
      registry,
      wall,
      privacy,
      blocks,
    );

    await expect(
      policy.authorize(target, 'viewer-1', 'READ'),
    ).resolves.toMatchObject({ allowed: false, reason: 'PROFILE_PRIVATE' });
    blocks.isBlocked.mockResolvedValue(true);
    await expect(
      policy.authorize(target, 'viewer-1', 'READ'),
    ).resolves.toMatchObject({ allowed: false, reason: 'PROFILE_BLOCKED' });
    wall.findById.mockResolvedValue({
      ...post,
      interactionTargetId: 'another-target',
    });
    await expect(
      policy.authorize(target, 'viewer-1', 'READ'),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'OWNER_RECORD_UNAVAILABLE',
    });
  });
});

/**
 * Privacy remains an owner concern, even when the feature is shared.
 */
