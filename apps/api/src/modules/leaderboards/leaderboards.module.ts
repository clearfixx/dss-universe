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
 * 🧠 Responsibilities:
 * • assembles private ranking presentation and repository adapters.
 *
 * 🏗️ Architecture:
 * Owner-local assembly; ranking facts enter through the root-composed input port.
 *
 * ⚠️ Important:
 * Keep query policy private; no scoring command is exported.
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
  exports: [],
})
export class LeaderboardsModule {}

/**
 * Leaderboards read the scoreboard. They never award the points.
 */
