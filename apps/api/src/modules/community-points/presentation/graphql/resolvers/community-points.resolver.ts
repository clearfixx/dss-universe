/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/presentation/graphql/resolvers/community-points.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes Community Points history and permission-backed controls.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { CommunityPointsService } from '../../../application/services/community-points.service';
import type {
  CommunityPointEntry,
  CommunityPointHistory,
  CommunityPointRule,
} from '../../../domain/types/community-points.type';
import { CommunityPointsPageInput } from '../inputs/community-points-page.input';
import { ReverseCommunityPointsInput } from '../inputs/reverse-community-points.input';
import { UpdateCommunityPointRuleInput } from '../inputs/update-community-point-rule.input';
import {
  CommunityPointEntryModel,
  CommunityPointHistoryModel,
  CommunityPointRuleModel,
} from '../models/community-points.model';

@Resolver()
export class CommunityPointsResolver {
  constructor(private readonly points: CommunityPointsService) {}

  @Query(() => CommunityPointHistoryModel)
  @UseGuards(JwtAuthGuard)
  communityPointsHistory(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true })
    pagination?: CommunityPointsPageInput,
  ): Promise<CommunityPointHistory> {
    return this.points.history(userId, pagination?.page, pagination?.limit);
  }

  @Query(() => [CommunityPointRuleModel])
  @UseGuards(JwtAuthGuard)
  communityPointRules(): Promise<CommunityPointRule[]> {
    return this.points.rules();
  }

  @Mutation(() => CommunityPointEntryModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CommunityPointsReverse)
  reverseCommunityPoints(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ReverseCommunityPointsInput,
  ): Promise<CommunityPointEntry> {
    return this.points.reverse(input.entryId, actor.id, input.reason);
  }

  @Mutation(() => CommunityPointRuleModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CommunityPointsSettingsManage)
  updateCommunityPointRule(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: UpdateCommunityPointRuleInput,
  ): Promise<CommunityPointRule> {
    return this.points.updateRule(
      input.key,
      input.points,
      input.dailyLimit,
      input.enabled,
      actor.id,
    );
  }
}

/**
 * GraphQL shows the mission log; integration events still earn the points.
 */
