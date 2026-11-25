/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-moderation.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for CH-1b forum moderation actions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Mutation,
  ObjectType,
  Resolver,
} from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { ForumModerationService } from '../infrastructure/prisma-forum-moderation';
import { ForumTopicModel } from './forum-topics.resolver';
import { ForumStaffNoteModel } from './forum-shared.models';

@ObjectType('ForumPostModerationResult')
class ForumPostModerationResultModel {
  @Field(() => ID) postId!: string;
  @Field() state!: string;
}

@ObjectType('ForumPurgeResult')
class ForumPurgeResultModel {
  @Field(() => ID) postId!: string;
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class ForumModerationResolver {
  constructor(private readonly moderation: ForumModerationService) {}

  @Mutation(() => ForumPostModerationResultModel)
  hideForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.moderation.hidePost(actor.id, postId, reason));
  }

  @Mutation(() => ForumPostModerationResultModel)
  deleteForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.moderation.deletePost(actor.id, postId, reason));
  }

  @Mutation(() => ForumPostModerationResultModel, {
    description:
      'Author deletes their own reply where the section grants "delete own".',
  })
  deleteOwnForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
  ) {
    return this.execute(this.moderation.deleteOwnPost(actor.id, postId));
  }

  @Mutation(() => ForumPostModerationResultModel)
  restoreForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
  ) {
    return this.execute(this.moderation.restorePost(actor.id, postId));
  }

  @Mutation(() => ForumPurgeResultModel)
  purgeForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.moderation.purgePost(actor.id, postId, reason));
  }

  @Mutation(() => ForumTopicModel)
  archiveForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.moderation.archiveTopic(actor.id, topicId));
  }

  @Mutation(() => ForumTopicModel)
  unarchiveForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.moderation.unarchiveTopic(actor.id, topicId));
  }

  @Mutation(() => ForumTopicModel)
  trashForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.moderation.trashTopic(actor.id, topicId));
  }

  @Mutation(() => ForumTopicModel)
  restoreForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.moderation.restoreTopic(actor.id, topicId));
  }

  @Mutation(() => ForumTopicModel)
  setForumTopicPinned(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('pinned') pinned: boolean,
  ) {
    return this.execute(this.moderation.pinTopic(actor.id, topicId, pinned));
  }

  @Mutation(() => ForumStaffNoteModel)
  addForumStaffNote(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('body') body: string,
  ) {
    return this.execute(this.moderation.addStaffNote(actor.id, postId, body));
  }

  @Mutation(() => Boolean)
  removeForumStaffNote(
    @AuthUser() actor: AuthenticatedUser,
    @Args('noteId', { type: () => ID }) noteId: string,
  ) {
    return this.execute(this.moderation.removeStaffNote(actor.id, noteId));
  }

  private async execute<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (!(error instanceof ForumCommandError)) throw error;
      switch (error.code) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_INPUT':
          throw new BadRequestException(error.message);
        case 'CONFLICT':
          throw new ConflictException(error.message);
        case 'RATE_LIMITED':
          throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }
}
