/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-integrations.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for topic subscriptions and News discussion links.
 *
 * ⚠️ Important:
 * Subscribing is not a content write, so read-only users keep it.
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
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AuthUser,
  JwtAuthGuard,
  PermittedWhileReadOnly,
  type AuthenticatedUser,
} from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { ForumIntegrationsService } from '../infrastructure/prisma-forum-integrations';
import { ForumTopicModel } from './forum-topics.resolver';

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class ForumIntegrationsResolver {
  constructor(private readonly integrations: ForumIntegrationsService) {}

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  @PermittedWhileReadOnly()
  subscribeForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.integrations.subscribe(actor.id, topicId));
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  @PermittedWhileReadOnly()
  unsubscribeForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.integrations.unsubscribe(actor.id, topicId));
  }

  @Query(() => Boolean)
  @UseGuards(OptionalViewerJwtGuard)
  forumTopicSubscribed(
    @Context() ctx: RequestContext,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(
      this.integrations.isSubscribed(ctx.req.user?.id ?? null, topicId),
    );
  }

  @Mutation(() => ForumTopicModel)
  @UseGuards(JwtAuthGuard)
  linkNewsDiscussion(
    @AuthUser() actor: AuthenticatedUser,
    @Args('articleId', { type: () => ID }) articleId: string,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(
      this.integrations.linkNewsDiscussion(actor.id, articleId, topicId),
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  unlinkNewsDiscussion(
    @AuthUser() actor: AuthenticatedUser,
    @Args('articleId', { type: () => ID }) articleId: string,
  ) {
    return this.execute(
      this.integrations.unlinkNewsDiscussion(actor.id, articleId),
    );
  }

  @Query(() => ForumTopicModel, { nullable: true })
  @UseGuards(OptionalViewerJwtGuard)
  newsDiscussionTopic(
    @Context() ctx: RequestContext,
    @Args('articleId', { type: () => ID }) articleId: string,
  ) {
    return this.execute(
      this.integrations.newsDiscussion(ctx.req.user?.id ?? null, articleId),
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
