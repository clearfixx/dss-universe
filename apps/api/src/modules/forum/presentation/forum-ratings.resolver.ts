/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-ratings.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for content rating votes, the voter dialog, views,
 * unread tracking and ranking settings.
 *
 * ⚠️ Important:
 * View and read markers are not content writes, so read-only users keep them.
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
import { IsInt, Max, Min } from 'class-validator';
import {
  AuthUser,
  JwtAuthGuard,
  PermittedWhileReadOnly,
  type AuthenticatedUser,
} from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { ForumRatingsService } from '../infrastructure/prisma-forum-ratings';

@ObjectType('ForumPostRating')
class ForumPostRatingModel {
  @Field(() => ID) postId!: string;
  @Field(() => Int) ratingUp!: number;
  @Field(() => Int) ratingDown!: number;
}

@ObjectType('ForumPostVote')
export class ForumPostVoteModel {
  @Field(() => ID) voterId!: string;
  @Field(() => Int) value!: number;
  @Field() createdAt!: Date;
  @Field() reversed!: boolean;
}

@ObjectType('ForumPostVotePage')
class ForumPostVotePageModel {
  @Field(() => [ForumPostVoteModel]) items!: ForumPostVoteModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

@ObjectType('ForumRankingSettings')
class ForumRankingSettingsModel {
  @Field(() => Int) hotGravitySeconds!: number;
  @Field(() => Int) hotReplyWeight!: number;
}

@InputType()
class ForumRankingSettingsInput {
  @Field(() => Int)
  @IsInt()
  @Min(3600)
  @Max(2_592_000)
  hotGravitySeconds!: number;
  @Field(() => Int) @IsInt() @Min(0) @Max(10) hotReplyWeight!: number;
}

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class ForumRatingsResolver {
  constructor(private readonly ratings: ForumRatingsService) {}

  @Mutation(() => ForumPostRatingModel)
  @UseGuards(JwtAuthGuard)
  voteForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('value', { type: () => Int }) value: number,
  ) {
    return this.execute(this.ratings.vote(actor.id, postId, value));
  }

  @Mutation(() => ForumPostRatingModel)
  @UseGuards(JwtAuthGuard)
  reverseForumPostVote(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('voterId', { type: () => ID }) voterId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(
      this.ratings.reverseVote(actor.id, postId, voterId, reason),
    );
  }

  @Query(() => ForumPostVotePageModel)
  @UseGuards(OptionalViewerJwtGuard)
  forumPostVotes(
    @Context() ctx: RequestContext,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ) {
    return this.execute(
      this.ratings.votes(ctx.req.user?.id ?? null, postId, page, limit),
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  @PermittedWhileReadOnly()
  async recordForumTopicView(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    await this.execute(this.ratings.recordView(actor.id, topicId));
    return true;
  }

  @Mutation(() => Int)
  @UseGuards(JwtAuthGuard)
  @PermittedWhileReadOnly()
  markForumTopicRead(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('upToNumber', { type: () => Int }) upToNumber: number,
  ) {
    return this.execute(this.ratings.markRead(actor.id, topicId, upToNumber));
  }

  @Query(() => ForumRankingSettingsModel)
  forumRankingSettings() {
    return this.execute(this.ratings.rankingSettings());
  }

  @Mutation(() => ForumRankingSettingsModel)
  @UseGuards(JwtAuthGuard)
  updateForumRankingSettings(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ForumRankingSettingsInput,
  ) {
    return this.execute(
      this.ratings.updateRankingSettings(actor.id, { ...input }),
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
