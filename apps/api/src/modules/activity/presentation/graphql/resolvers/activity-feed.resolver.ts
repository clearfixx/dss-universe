import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { ActivityFeedService } from '../../../application/services/activity-feed.service';
import { ActivityFeedInput } from '../inputs/activity-feed.input';
import {
  ActivityFeedPageModel,
  ActivityFeedVisitModel,
} from '../models/activity-feed.model';

@Resolver()
export class ActivityFeedResolver {
  constructor(private readonly feed: ActivityFeedService) {}

  @Query(() => ActivityFeedPageModel)
  async publicActivityFeed(
    @Args('input', { nullable: true }) input?: ActivityFeedInput,
  ): Promise<ActivityFeedPageModel> {
    return this.toModel(
      await this.feed.publicFeed(input?.modules, input?.page, input?.limit),
    );
  }

  @Query(() => ActivityFeedPageModel)
  @UseGuards(JwtAuthGuard)
  async viewerActivityFeed(
    @AuthUser() viewer: AuthenticatedUser,
    @Args('input', { nullable: true }) input?: ActivityFeedInput,
  ): Promise<ActivityFeedPageModel> {
    return this.toModel(
      await this.feed.personalizedFeed(
        viewer.id,
        input?.modules,
        input?.page,
        input?.limit,
      ),
    );
  }

  @Mutation(() => ActivityFeedVisitModel)
  @UseGuards(JwtAuthGuard)
  async markActivityFeedVisited(
    @AuthUser() viewer: AuthenticatedUser,
  ): Promise<ActivityFeedVisitModel> {
    return {
      visitedAt: (await this.feed.markVisited(viewer.id)).toISOString(),
    };
  }

  private toModel(
    page: Awaited<ReturnType<ActivityFeedService['publicFeed']>>,
  ): ActivityFeedPageModel {
    return {
      ...page,
      lastVisitedAt: page.lastVisitedAt?.toISOString() ?? null,
      generatedAt: page.generatedAt.toISOString(),
      items: page.items.map((item) => ({
        id: item.id,
        actorId: item.actorId,
        module: item.module,
        action: item.action,
        subjectType: item.subjectType,
        subjectId: item.subjectId,
        occurredAt: item.occurredAt.toISOString(),
        isUnread: item.isUnread,
        reason: item.reason,
        score: item.score,
      })),
    } as ActivityFeedPageModel;
  }
}
