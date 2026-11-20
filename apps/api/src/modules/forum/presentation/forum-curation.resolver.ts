/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-curation.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for accepted answers, curated tags and topic polls.
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
  Context,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Min,
} from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import type { PollVisibility } from '@api/modules/interactions';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { ForumCurationService } from '../infrastructure/prisma-forum-curation';
import { ForumTopicModel } from './forum-topics.resolver';

@ObjectType('ForumTag')
class ForumTagModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) forumId!: string;
  @Field() slug!: string;
  @Field() label!: string;
  @Field() active!: boolean;
}

@ObjectType('ForumTopicPollReceipt')
class ForumTopicPollReceiptModel {
  @Field(() => ID) pollId!: string;
}

@InputType()
class ForumTagInput {
  @Field() @IsString() slug!: string;
  @Field() @IsString() label!: string;
  @Field({ defaultValue: true }) @IsBoolean() active!: boolean;
}

@InputType()
class ForumTopicPollInput {
  @Field() @IsString() question!: string;
  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  options!: string[];
  @Field(() => String, {
    defaultValue: 'OPEN',
    description: 'OPEN or ANONYMOUS',
  })
  @IsIn(['OPEN', 'ANONYMOUS'])
  visibility!: PollVisibility;
  @Field(() => Int, { defaultValue: 1 }) @IsInt() @Min(1) maxChoices!: number;
}

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class ForumCurationResolver {
  constructor(private readonly curation: ForumCurationService) {}

  @Mutation(() => ForumTopicModel)
  @UseGuards(JwtAuthGuard)
  acceptForumAnswer(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('postId', { type: () => ID }) postId: string,
  ) {
    return this.execute(this.curation.acceptAnswer(actor.id, topicId, postId));
  }

  @Mutation(() => ForumTopicModel)
  @UseGuards(JwtAuthGuard)
  clearForumAcceptedAnswer(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.curation.clearAcceptedAnswer(actor.id, topicId));
  }

  @Query(() => [ForumTagModel])
  @UseGuards(OptionalViewerJwtGuard)
  forumTags(
    @Context() ctx: RequestContext,
    @Args('forumId', { type: () => ID }) forumId: string,
  ) {
    return this.execute(
      this.curation.forumTags(ctx.req.user?.id ?? null, forumId),
    );
  }

  @Mutation(() => ForumTagModel)
  @UseGuards(JwtAuthGuard)
  createForumTag(
    @AuthUser() actor: AuthenticatedUser,
    @Args('forumId', { type: () => ID }) forumId: string,
    @Args('input') input: ForumTagInput,
  ) {
    return this.execute(
      this.curation.createTag(actor.id, forumId, {
        slug: input.slug,
        label: input.label,
      }),
    );
  }

  @Mutation(() => ForumTagModel)
  @UseGuards(JwtAuthGuard)
  updateForumTag(
    @AuthUser() actor: AuthenticatedUser,
    @Args('tagId', { type: () => ID }) tagId: string,
    @Args('input') input: ForumTagInput,
  ) {
    return this.execute(this.curation.updateTag(actor.id, tagId, { ...input }));
  }

  @Mutation(() => ForumTopicModel)
  @UseGuards(JwtAuthGuard)
  setForumTopicTags(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('tagIds', { type: () => [ID] }) tagIds: string[],
  ) {
    return this.execute(this.curation.setTopicTags(actor.id, topicId, tagIds));
  }

  @Mutation(() => ForumTopicPollReceiptModel)
  @UseGuards(JwtAuthGuard)
  attachForumTopicPoll(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('input') input: ForumTopicPollInput,
  ) {
    return this.execute(
      this.curation.attachPoll(actor.id, topicId, { ...input }),
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
          throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }
}
