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
 * • evaluates minimal Profile Wall owner coordinates;
 * • enforces block and profile-visibility policy;
 * • verifies that target coordinates resolve to the owning post.
 *
 * 🏗️ Architecture:
 * Private Users policy implementing only its published decision contract.
 *
 * ⚠️ Important:
 * Missing coordinates, blocks and private profiles fail closed before interaction access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import type {
  ProfileWallInteractionDecisions,
  ProfileWallInteractionRequest,
  ProfileWallInteractionDecision,
} from '../../contracts/profile-wall-interaction-decisions.contract';
import {
  USER_WALL_REPOSITORY,
  type UserWallRepository,
} from '../../domain/repositories/user-wall.repository.interface';
import { UserBlockService } from './user-block.service';
import { UserPrivacyService } from './user-privacy.service';

@Injectable()
export class ProfileWallInteractionPolicy implements ProfileWallInteractionDecisions {
  constructor(
    @Inject(USER_WALL_REPOSITORY)
    private readonly wall: UserWallRepository,
    private readonly privacy: UserPrivacyService,
    private readonly blocks: UserBlockService,
  ) {}

  async authorize({
    postId,
    interactionTargetId,
    viewerId: actorId,
  }: ProfileWallInteractionRequest): Promise<ProfileWallInteractionDecision> {
    const post = await this.wall.findById(postId);
    if (!post || post.interactionTargetId !== interactionTargetId) {
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
