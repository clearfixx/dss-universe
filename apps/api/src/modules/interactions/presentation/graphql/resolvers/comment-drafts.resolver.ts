/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/comment-drafts.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes the authenticated Comments-owned draft lifecycle through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { CommentDraftsService } from '../../../application/services/comment-drafts.service';
import type { CommentDraft } from '../../../domain/types/comment-draft.type';
import { SaveCommentDraftInput } from '../inputs/comment-draft.input';
import { CommentDraftModel } from '../models/comment-draft.model';

@Resolver(() => CommentDraftModel)
@UseGuards(JwtAuthGuard)
export class CommentDraftsResolver {
  constructor(private readonly drafts: CommentDraftsService) {}

  @Mutation(() => CommentDraftModel)
  async saveCommentDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SaveCommentDraftInput,
  ): Promise<CommentDraftModel> {
    return this.toModel(await this.drafts.save(actor.id, input));
  }

  @Query(() => CommentDraftModel, { nullable: true })
  async commentDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
    @Args('parentId', { type: () => ID, nullable: true }) parentId?: string,
  ): Promise<CommentDraftModel | null> {
    const draft = await this.drafts.restore(
      actor.id,
      interactionTargetId,
      parentId,
    );
    return draft ? this.toModel(draft) : null;
  }

  @Query(() => [CommentDraftModel])
  async viewerCommentDrafts(
    @AuthUser() actor: AuthenticatedUser,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<CommentDraftModel[]> {
    return (await this.drafts.list(actor.id, limit)).map((draft) =>
      this.toModel(draft),
    );
  }

  @Mutation(() => Boolean)
  discardCommentDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('draftId', { type: () => ID }) draftId: string,
  ): Promise<boolean> {
    return this.drafts.discard(actor.id, draftId);
  }

  private toModel(draft: CommentDraft): CommentDraftModel {
    return {
      ...draft,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }
}

/** GraphQL restores a snapshot; the author restores the train of thought. */
