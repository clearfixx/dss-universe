/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/reactions.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated shared reaction commands and aggregate reads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { ReactionsService } from '../../../application/services/reactions.service';
import type {
  Reaction,
  ReactionSummary,
} from '../../../domain/types/reaction.type';
import { ReactionKindModel, SetReactionInput } from '../inputs/reaction.input';
import {
  ReactionModel,
  ReactionSummaryModel,
  SetReactionPayloadModel,
} from '../models/reaction.model';

@Resolver(() => ReactionModel)
@UseGuards(JwtAuthGuard)
export class ReactionsResolver {
  constructor(private readonly reactions: ReactionsService) {}

  @Mutation(() => SetReactionPayloadModel)
  async setReaction(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SetReactionInput,
  ): Promise<SetReactionPayloadModel> {
    const result = await this.reactions.set(
      actor.id,
      input.interactionTargetId,
      input.kind,
    );
    return {
      reaction: this.toReaction(result.reaction),
      summary: this.toSummary({
        ...result.aggregate,
        viewerReaction: result.reaction.kind,
      }),
      changed: result.changed,
    };
  }

  @Mutation(() => ReactionSummaryModel)
  async clearReaction(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
  ): Promise<ReactionSummaryModel> {
    return this.toSummary(
      await this.reactions.clear(actor.id, interactionTargetId),
    );
  }

  @Query(() => ReactionSummaryModel)
  async reactionSummary(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
  ): Promise<ReactionSummaryModel> {
    return this.toSummary(
      await this.reactions.summary(actor.id, interactionTargetId),
    );
  }

  private toReaction(reaction: Reaction): ReactionModel {
    return {
      ...reaction,
      kind: reaction.kind as ReactionKindModel,
      createdAt: reaction.createdAt.toISOString(),
      updatedAt: reaction.updatedAt.toISOString(),
    };
  }

  private toSummary(summary: ReactionSummary): ReactionSummaryModel {
    return {
      ...summary,
      viewerReaction: summary.viewerReaction as ReactionKindModel | null,
      updatedAt: summary.updatedAt?.toISOString() ?? null,
    };
  }
}

/**
 * A retry may knock twice; idempotency only answers once.
 */
