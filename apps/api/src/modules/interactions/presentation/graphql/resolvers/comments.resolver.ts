/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/comments.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated shared comment commands and paginated reads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { CommentsService } from '../../../application/services/comments.service';
import type {
  Comment,
  CommentRevision,
} from '../../../domain/types/comment.type';
import {
  CommentsPageInput,
  CreateCommentInput,
  EditCommentInput,
} from '../inputs/comment.input';
import {
  CommentModel,
  CommentPageModel,
  CommentRevisionModel,
} from '../models/comment.model';

@Resolver(() => CommentModel)
@UseGuards(JwtAuthGuard)
export class CommentsResolver {
  constructor(private readonly comments: CommentsService) {}

  @Mutation(() => CommentModel)
  async createComment(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateCommentInput,
  ): Promise<CommentModel> {
    return this.toModel(
      await this.comments.create(
        actor.id,
        input.interactionTargetId,
        { body: input.body, documentJson: input.documentJson },
        input.parentId,
      ),
    );
  }

  @Query(() => CommentPageModel)
  async commentsForTarget(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
    @Args('parentId', { type: () => ID, nullable: true })
    parentId?: string,
    @Args('pagination', { nullable: true })
    pagination?: CommentsPageInput,
  ): Promise<CommentPageModel> {
    const result = await this.comments.list(
      actor.id,
      interactionTargetId,
      parentId ?? null,
      pagination?.page,
      pagination?.limit,
    );
    return {
      ...result,
      items: result.items.map((comment) => this.toModel(comment)),
    };
  }

  @Mutation(() => CommentModel)
  async editComment(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: EditCommentInput,
  ): Promise<CommentModel> {
    return this.toModel(
      await this.comments.edit(actor.id, input.commentId, {
        body: input.body,
        documentJson: input.documentJson,
      }),
    );
  }

  @Mutation(() => CommentModel)
  async removeComment(
    @AuthUser() actor: AuthenticatedUser,
    @Args('commentId', { type: () => ID }) commentId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<CommentModel> {
    return this.toModel(
      await this.comments.remove(actor.id, commentId, reason),
    );
  }

  @Query(() => [CommentRevisionModel])
  async commentRevisions(
    @AuthUser() actor: AuthenticatedUser,
    @Args('commentId', { type: () => ID }) commentId: string,
  ): Promise<CommentRevisionModel[]> {
    return (await this.comments.revisions(actor.id, commentId)).map(
      (revision) => this.toRevision(revision),
    );
  }

  private toModel(comment: Comment): CommentModel {
    return {
      ...comment,
      editedAt: comment.editedAt?.toISOString() ?? null,
      deletedAt: comment.deletedAt?.toISOString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private toRevision(revision: CommentRevision): CommentRevisionModel {
    return {
      ...revision,
      createdAt: revision.createdAt.toISOString(),
    };
  }
}

/**
 * The resolver speaks GraphQL; the service speaks policy. No translation drama.
 */
