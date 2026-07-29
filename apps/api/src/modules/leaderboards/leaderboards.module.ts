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

import { PrismaModule } from '@api/core/database';

import { LeaderboardsService } from './application/services/leaderboards.service';
import { LEADERBOARDS_REPOSITORY } from './domain/repositories/leaderboards.repository.interface';
import { PrismaLeaderboardsRepository } from './infrastructure/repositories/prisma-leaderboards.repository';
import { LeaderboardsResolver } from './presentation/graphql/resolvers/leaderboards.resolver';

@Module({
  imports: [PrismaModule],
  providers: [
    LeaderboardsService,
    LeaderboardsResolver,
    {
      provide: LEADERBOARDS_REPOSITORY,
      useClass: PrismaLeaderboardsRepository,
    },
  ],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}

/**
 * Leaderboards read the scoreboard. They never award the points.
 */
