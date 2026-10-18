/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/leaderboards.module.ts
 *
 * 🎯 Purpose:
 * Wires the read-only Community Points leaderboard bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { LeaderboardsService } from './application/services/leaderboards.service';
import { LEADERBOARDS_REPOSITORY } from './domain/repositories/leaderboards.repository.interface';
import { RankingFactsLeaderboardsRepository } from './infrastructure/repositories/ranking-facts-leaderboards.repository';
import { LeaderboardsResolver } from './presentation/graphql/resolvers/leaderboards.resolver';

@Module({
  providers: [
    LeaderboardsService,
    LeaderboardsResolver,
    {
      provide: LEADERBOARDS_REPOSITORY,
      useClass: RankingFactsLeaderboardsRepository,
    },
  ],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}

/**
 * Leaderboards read the scoreboard. They never award the points.
 */
