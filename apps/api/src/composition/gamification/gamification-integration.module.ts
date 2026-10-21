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
 * • binds default-isolation award/title units to guarded owner persistence adapters.
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
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { EventsModule } from '@api/core/events';
import { PrismaTransactionalProfileExistenceReader } from '@api/modules/users/infrastructure';
import { PrismaManualAwardWriter } from '@api/modules/achievements/infrastructure';
import { PrismaTitleGrantWriter } from '@api/modules/custom-titles/infrastructure';
import {
  CustomTitlesModule,
  TITLE_GRANT_TRANSACTION,
} from '@api/modules/custom-titles';
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
  MANUAL_AWARD_TRANSACTION,
} from '@api/modules/achievements';
import { RecipientExistenceAdapter } from './infrastructure/recipient-existence.adapter';
import { LevelPointsBalanceAdapter } from './infrastructure/level-points-balance.adapter';
import { PrismaManualAwardTransaction } from './infrastructure/prisma-manual-award.transaction';
import { PrismaTitleGrantTransaction } from './infrastructure/prisma-title-grant.transaction';
@Global()
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EventsModule,
    CustomTitlesModule,
    UsersModule,
    CommunityPointsModule,
    LevelsModule,
    AchievementsModule,
  ],
  providers: [
    PrismaTransactionalProfileExistenceReader,
    PrismaManualAwardWriter,
    PrismaTitleGrantWriter,
    {
      provide: MANUAL_AWARD_TRANSACTION,
      useClass: PrismaManualAwardTransaction,
    },
    { provide: TITLE_GRANT_TRANSACTION, useClass: PrismaTitleGrantTransaction },
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
    MANUAL_AWARD_TRANSACTION,
    TITLE_GRANT_TRANSACTION,
    POINTS_RECIPIENT_EXISTENCE,
    LEVEL_RECIPIENT_EXISTENCE,
    ACHIEVEMENT_RECIPIENT_EXISTENCE,
    LEVEL_POINTS_BALANCE_READER,
  ],
})
export class GamificationIntegrationModule {}
