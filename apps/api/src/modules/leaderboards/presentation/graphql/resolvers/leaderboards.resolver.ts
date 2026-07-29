/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/presentation/graphql/resolvers/leaderboards.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated Community Points leaderboard discovery.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { LeaderboardsService } from '../../../application/services/leaderboards.service';
import type { LeaderboardPage } from '../../../domain/types/leaderboards.type';
import {
  LeaderboardInput,
  LeaderboardPeriodInput,
} from '../inputs/leaderboard.input';
import { LeaderboardPageModel } from '../models/leaderboards.model';

@Resolver()
export class LeaderboardsResolver {
  constructor(private readonly leaderboards: LeaderboardsService) {}

  @Query(() => LeaderboardPageModel)
  @UseGuards(JwtAuthGuard)
  async leaderboard(
    @AuthUser() viewer: AuthenticatedUser,
    @Args('input', { nullable: true }) input?: LeaderboardInput,
  ): Promise<LeaderboardPageModel> {
    const result = await this.leaderboards.page(
      viewer.id,
      input?.period,
      input?.page,
      input?.limit,
    );
    return this.toModel(result);
  }

  private toModel(page: LeaderboardPage): LeaderboardPageModel {
    return {
      ...page,
      period: LeaderboardPeriodInput[page.period],
      startsAt: page.startsAt?.toISOString() ?? null,
      endsAt: page.endsAt.toISOString(),
      generatedAt: page.generatedAt.toISOString(),
    };
  }
}

/**
 * The resolver announces the race; it never moves the finish line.
 */
