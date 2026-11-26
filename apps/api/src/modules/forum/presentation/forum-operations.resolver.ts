/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-operations.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for curators, topic and post moves, merge/split and
 * scoped sanctions.
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
  Int,
  Mutation,
  ObjectType,
  Resolver,
} from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { ForumOperationsService } from '../infrastructure/prisma-forum-operations';
import { ForumTopicModel } from './forum-topics.resolver';

@ObjectType('ForumSanctionReceipt')
class ForumSanctionReceiptModel {
  @Field(() => ID) sanctionId!: string;
  @Field(() => ID, { nullable: true }) escalatedSanctionId!: string | null;
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class ForumOperationsResolver {
  constructor(private readonly operations: ForumOperationsService) {}

  @Mutation(() => ForumTopicModel)
  setForumTopicCurator(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('curatorId', { type: () => ID, nullable: true })
    curatorId: string | null,
  ) {
    return this.execute(
      this.operations.setCurator(actor.id, topicId, curatorId ?? null),
    );
  }

  @Mutation(() => ForumTopicModel)
  moveForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('targetForumId', { type: () => ID }) targetForumId: string,
  ) {
    return this.execute(
      this.operations.moveTopic(actor.id, topicId, targetForumId),
    );
  }

  @Mutation(() => ForumTopicModel)
  moveForumPosts(
    @AuthUser() actor: AuthenticatedUser,
    @Args('sourceTopicId', { type: () => ID }) sourceTopicId: string,
    @Args('numbers', { type: () => [Int] }) numbers: number[],
    @Args('targetTopicId', { type: () => ID }) targetTopicId: string,
  ) {
    return this.execute(
      this.operations.movePosts(
        actor.id,
        sourceTopicId,
        numbers,
        targetTopicId,
      ),
    );
  }

  @Mutation(() => ForumTopicModel)
  mergeForumTopics(
    @AuthUser() actor: AuthenticatedUser,
    @Args('sourceTopicId', { type: () => ID }) sourceTopicId: string,
    @Args('targetTopicId', { type: () => ID }) targetTopicId: string,
  ) {
    return this.execute(
      this.operations.mergeTopics(actor.id, sourceTopicId, targetTopicId),
    );
  }

  @Mutation(() => ForumTopicModel)
  splitForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('sourceTopicId', { type: () => ID }) sourceTopicId: string,
    @Args('numbers', { type: () => [Int] }) numbers: number[],
    @Args('title') title: string,
  ) {
    return this.execute(
      this.operations.splitTopic(actor.id, sourceTopicId, numbers, title),
    );
  }

  @Mutation(() => ForumSanctionReceiptModel)
  warnForumPostAuthor(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.operations.warnAuthor(actor.id, postId, reason));
  }

  @Mutation(() => ForumSanctionReceiptModel)
  restrictForumPostAuthor(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason') reason: string,
    @Args('until') until: Date,
  ) {
    return this.execute(
      this.operations.restrictAuthor(actor.id, postId, reason, until),
    );
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
          throw new HttpException(
            {
              message: error.message,
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
      }
    }
  }
}
