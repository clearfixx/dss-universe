/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/reactions.service.ts
 *
 * 🎯 Purpose:
 * Coordinates target-authorized shared reaction use cases.
 *
 * 🧠 Responsibilities:
 * • asks the target owner to authorize reads and reaction changes;
 * • applies one canonical reaction per actor and target;
 * • keeps content reactions independent from Reputation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import {
  REACTIONS_REPOSITORY,
  type ReactionsRepository,
} from '../../domain/repositories/reactions.repository.interface';
import type {
  ReactionKind,
  ReactionSummary,
  SetReactionResult,
} from '../../domain/types/reaction.type';
import { InteractionTargetsService } from './interaction-targets.service';

@Injectable()
export class ReactionsService {
  constructor(
    @Inject(REACTIONS_REPOSITORY)
    private readonly reactions: ReactionsRepository,
    private readonly targets: InteractionTargetsService,
  ) {}

  async set(
    actorId: string,
    targetId: string,
    kind: ReactionKind,
  ): Promise<SetReactionResult> {
    await this.assertAccess(targetId, actorId, 'REACT');
    return this.reactions.set(targetId, actorId, kind);
  }

  async clear(actorId: string, targetId: string): Promise<ReactionSummary> {
    await this.assertAccess(targetId, actorId, 'REACT');
    const result = await this.reactions.clear(targetId, actorId);
    return { ...result.aggregate, viewerReaction: null };
  }

  async summary(actorId: string, targetId: string): Promise<ReactionSummary> {
    await this.assertAccess(targetId, actorId, 'READ');
    return this.reactions.summary(targetId, actorId);
  }

  private async assertAccess(
    targetId: string,
    actorId: string,
    capability: 'READ' | 'REACT',
  ): Promise<void> {
    const decision = await this.targets.authorize(
      targetId,
      actorId,
      capability,
    );
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Interaction target denied ${capability.toLowerCase()}: ${
          decision.reason ?? 'POLICY_DENIED'
        }.`,
      );
    }
  }
}

/**
 * A vote is a content signal. Reputation remains a deliberate human judgment.
 */
