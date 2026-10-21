/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboard Read Composition
 * 📄 File: apps/api/src/composition/leaderboards/leaderboard-read-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires the Leaderboards facts input without feature-to-feature persistence imports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import {
  LEADERBOARD_RANKING_FACTS,
  LeaderboardsModule,
} from '@api/modules/leaderboards';
import { PrismaLeaderboardRankingReader } from './infrastructure/prisma-leaderboard-ranking.reader';
@Global()
@Module({
  imports: [PrismaModule, LeaderboardsModule],
  providers: [
    {
      provide: LEADERBOARD_RANKING_FACTS,
      useClass: PrismaLeaderboardRankingReader,
    },
  ],
  exports: [LEADERBOARD_RANKING_FACTS],
})
export class LeaderboardReadCompositionModule {}
