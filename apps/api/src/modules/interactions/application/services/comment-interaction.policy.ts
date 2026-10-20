/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/comment-interaction.policy.ts
 *
 * 🎯 Purpose:
 * Applies comment lifecycle/capability rules and inherits the parent's viewer access.
 *
 * 🧠 Responsibilities:
 * • verifies canonical comment coordinates;
 * • forwards the same explicit viewer to parent READ;
 * • retains local registration and unregistration identity.
 *
 * 🏗️ Architecture:
 * Private Interactions policy; no foreign content or identity dependency.
 *
 * ⚠️ Important:
 * The comment author must never replace the requesting viewer.
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
  COMMENTS_REPOSITORY,
  type CommentsRepository,
} from '../../domain/repositories/comments.repository.interface';
import type {
  InteractionCapability,
  InteractionTarget,
  InteractionTargetPolicy,
} from '../../domain/types/interaction-target.type';
import { InteractionPolicyRegistryService } from './interaction-policy-registry.service';
import { InteractionTargetsService } from './interaction-targets.service';
import type { InteractionViewer } from '../../domain/types/interaction-viewer.type';

@Injectable()
export class CommentInteractionPolicy
  implements InteractionTargetPolicy, OnModuleInit, OnModuleDestroy
{
  readonly kind = 'comment';

  constructor(
    private readonly policies: InteractionPolicyRegistryService,
    private readonly targets: InteractionTargetsService,
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
  ) {}

  onModuleInit(): void {
    this.policies.register(this);
  }

  onModuleDestroy(): void {
    this.policies.unregister(this);
  }

  async authorize(
    target: InteractionTarget,
    viewer: InteractionViewer,
    capability: InteractionCapability,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const comment = await this.comments.findById(target.ownerId);
    if (!comment || comment.reactionTargetId !== target.id) {
      return { allowed: false, reason: 'COMMENT_UNAVAILABLE' };
    }
    if (comment.isDeleted && capability !== 'READ') {
      return { allowed: false, reason: 'COMMENT_DELETED' };
    }
    if (capability !== 'READ' && capability !== 'REACT') {
      return { allowed: false, reason: 'COMMENT_CAPABILITY_UNAVAILABLE' };
    }
    const parent = await this.targets.authorize(
      comment.interactionTargetId,
      viewer,
      'READ',
    );
    return parent.allowed
      ? { allowed: true }
      : { allowed: false, reason: parent.reason ?? 'PARENT_TARGET_DENIED' };
  }
}
