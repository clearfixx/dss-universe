/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/resolvers/achievements.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes achievement discovery, policy administration, awards, and rollback.
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

import { AchievementsService } from '../../../application/services/achievements.service';
import type {
  AchievementAward,
  AchievementDefinition,
  AchievementRule,
} from '../../../domain/types/achievements.type';
import { ManualAchievementAwardInput } from '../inputs/manual-achievement-award.input';
import { RevokeAchievementAwardInput } from '../inputs/revoke-achievement-award.input';
import { RollbackAchievementSourceInput } from '../inputs/rollback-achievement-source.input';
import { SaveAchievementRuleInput } from '../inputs/save-achievement-rule.input';
import { SaveAchievementInput } from '../inputs/save-achievement.input';
import {
  AchievementAwardModel,
  AchievementModel,
  AchievementRuleModel,
} from '../models/achievements.model';

@Resolver()
export class AchievementsResolver {
  constructor(private readonly service: AchievementsService) {}

  @Query(() => [AchievementModel])
  @UseGuards(JwtAuthGuard)
  achievements(): Promise<AchievementDefinition[]> {
    return this.service.definitions();
  }

  @Query(() => [AchievementModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  achievementsAdmin(): Promise<AchievementDefinition[]> {
    return this.service.definitions(true);
  }

  @Query(() => [AchievementRuleModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  achievementRules(): Promise<AchievementRule[]> {
    return this.service.rules(true);
  }

  @Query(() => [AchievementAwardModel])
  @UseGuards(JwtAuthGuard)
  userAchievements(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<AchievementAward[]> {
    return this.service.awards(userId);
  }

  @Query(() => [AchievementAwardModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  userAchievementHistory(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<AchievementAward[]> {
    return this.service.awards(userId, true);
  }

  @Mutation(() => AchievementModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  saveAchievement(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SaveAchievementInput,
  ): Promise<AchievementDefinition> {
    return this.service.writeDefinition(input, actor.id);
  }

  @Mutation(() => AchievementRuleModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  saveAchievementRule(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SaveAchievementRuleInput,
  ): Promise<AchievementRule> {
    return this.service.writeRule(input, actor.id);
  }

  @Mutation(() => AchievementAwardModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  awardAchievement(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ManualAchievementAwardInput,
  ): Promise<AchievementAward> {
    return this.service.manualAward(
      input.userId,
      input.achievementId,
      input.reason,
      actor.id,
    );
  }

  @Mutation(() => AchievementAwardModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  revokeAchievementAward(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: RevokeAchievementAwardInput,
  ): Promise<AchievementAward> {
    return this.service.revoke(input.awardId, input.reason, actor.id);
  }

  @Mutation(() => [AchievementAwardModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AchievementsManage)
  rollbackAchievementSource(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: RollbackAchievementSourceInput,
  ): Promise<AchievementAward[]> {
    return this.service.rollbackSource(
      input.sourceType,
      input.sourceId,
      input.reason,
      actor.id,
    );
  }
}

/**
 * Resolvers expose recognition. Guards continue to own clearance.
 */
