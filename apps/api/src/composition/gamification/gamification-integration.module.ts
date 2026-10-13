/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/gamification-integration.module.ts
 *
 * 🎯 Purpose:
 * Wires independent feature input ports without feature-to-feature service injection.
 *
 * 🧠 Responsibilities:
 * • binds recipient ports and scalar Points reads outside feature owners;
 *
 * 🏗️ Architecture:
 * Root composition; modules know only their own contracts.
 *
 * ⚠️ Important:
 * Do not inject foreign broad services or move scoring policy into adapters.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { UsersModule } from '@api/modules/users';
import {
  CommunityPointsModule,
  POINTS_RECIPIENT_EXISTENCE,
} from '@api/modules/community-points';
import {
  LevelsModule,
  LEVEL_RECIPIENT_EXISTENCE,
  LEVEL_POINTS_BALANCE_READER,
} from '@api/modules/levels';
import {
  AchievementsModule,
  ACHIEVEMENT_RECIPIENT_EXISTENCE,
} from '@api/modules/achievements';
import { RecipientExistenceAdapter } from './infrastructure/recipient-existence.adapter';
import { LevelPointsBalanceAdapter } from './infrastructure/level-points-balance.adapter';
@Global()
@Module({
  imports: [
    UsersModule,
    CommunityPointsModule,
    LevelsModule,
    AchievementsModule,
  ],
  providers: [
    {
      provide: POINTS_RECIPIENT_EXISTENCE,
      useClass: RecipientExistenceAdapter,
    },
    { provide: LEVEL_RECIPIENT_EXISTENCE, useClass: RecipientExistenceAdapter },
    {
      provide: ACHIEVEMENT_RECIPIENT_EXISTENCE,
      useClass: RecipientExistenceAdapter,
    },
    {
      provide: LEVEL_POINTS_BALANCE_READER,
      useClass: LevelPointsBalanceAdapter,
    },
  ],
  exports: [
    POINTS_RECIPIENT_EXISTENCE,
    LEVEL_RECIPIENT_EXISTENCE,
    ACHIEVEMENT_RECIPIENT_EXISTENCE,
    LEVEL_POINTS_BALANCE_READER,
  ],
})
export class GamificationIntegrationModule {}
