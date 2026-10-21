/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/presentation/graphql/resolvers/levels.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes level progress, history and permission-backed threshold management.
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

import { LevelsService } from '../../../application/services/levels.service';
import type {
  LevelDefinition,
  LevelProgress,
  LevelTransitionHistory,
} from '../../../domain/types/levels.type';
import { LevelHistoryPageInput } from '../inputs/level-history-page.input';
import { UpdateLevelDefinitionInput } from '../inputs/update-level-definition.input';
import {
  LevelDefinitionModel,
  LevelProgressModel,
  LevelTransitionHistoryModel,
} from '../models/levels.model';

@Resolver()
export class LevelsResolver {
  constructor(private readonly levels: LevelsService) {}

  @Query(() => LevelProgressModel)
  @UseGuards(JwtAuthGuard)
  levelProgress(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<LevelProgress> {
    return this.levels.progress(userId);
  }

  @Query(() => [LevelDefinitionModel])
  @UseGuards(JwtAuthGuard)
  levelDefinitions(): Promise<LevelDefinition[]> {
    return this.levels.definitions();
  }

  @Query(() => LevelTransitionHistoryModel)
  @UseGuards(JwtAuthGuard)
  levelHistory(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true }) pagination?: LevelHistoryPageInput,
  ): Promise<LevelTransitionHistory> {
    return this.levels.history(userId, pagination?.page, pagination?.limit);
  }

  @Mutation(() => LevelDefinitionModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.LevelsSettingsManage)
  updateLevelDefinition(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: UpdateLevelDefinitionInput,
  ): Promise<LevelDefinition> {
    return this.levels.updateDefinition(input.level, input.threshold, actor.id);
  }
}

/**
 * The resolver reports altitude. Community Points still power the climb.
 */
