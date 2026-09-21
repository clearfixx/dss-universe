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
    actorId: string,
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
      actorId,
      'READ',
    );
    return parent.allowed
      ? { allowed: true }
      : { allowed: false, reason: parent.reason ?? 'PARENT_TARGET_DENIED' };
  }
}
