/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/profile-wall-interaction.policy.ts
 *
 * 🎯 Purpose:
 * Authorizes shared interactions against Profile Wall ownership rules.
 *
 * 🧠 Responsibilities:
 * • registers Profile Wall target ownership;
 * • enforces block and profile-visibility policy;
 * • verifies that target coordinates resolve to the owning post.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import {
  InteractionPolicyRegistryService,
  type InteractionCapability,
  type InteractionTarget,
  type InteractionTargetPolicy,
} from '../../../interactions';
import {
  USER_WALL_REPOSITORY,
  type UserWallRepository,
} from '../../domain/repositories/user-wall.repository.interface';
import { UserBlockService } from './user-block.service';
import { UserPrivacyService } from './user-privacy.service';

export const PROFILE_WALL_INTERACTION_KIND = 'users.profile-wall-post';

@Injectable()
export class ProfileWallInteractionPolicy
  implements InteractionTargetPolicy, OnModuleInit, OnModuleDestroy
{
  readonly kind = PROFILE_WALL_INTERACTION_KIND;

  constructor(
    private readonly policies: InteractionPolicyRegistryService,
    @Inject(USER_WALL_REPOSITORY)
    private readonly wall: UserWallRepository,
    private readonly privacy: UserPrivacyService,
    private readonly blocks: UserBlockService,
  ) {}

  onModuleInit(): void {
    this.policies.register(this);
  }

  onModuleDestroy(): void {
    this.policies.unregister(this);
  }

  async authorize(
    target: InteractionTarget,
    actorId: string,
    capability: InteractionCapability,
  ): Promise<{ allowed: boolean; reason?: string }> {
    void capability;
    const post = await this.wall.findById(target.ownerId);
    if (!post || post.interactionTargetId !== target.id) {
      return { allowed: false, reason: 'OWNER_RECORD_UNAVAILABLE' };
    }
    if (await this.blocks.isBlocked(actorId, post.profileOwnerId)) {
      return { allowed: false, reason: 'PROFILE_BLOCKED' };
    }
    const visibility = await this.privacy.visibilityFor(
      post.profileOwnerId,
      actorId,
    );
    if (
      actorId !== post.profileOwnerId &&
      visibility.profileVisibility === 'PRIVATE'
    ) {
      return { allowed: false, reason: 'PROFILE_PRIVATE' };
    }
    return { allowed: true };
  }
}

/**
 * Shared comments may visit the wall; the wall still owns the house rules.
 */
