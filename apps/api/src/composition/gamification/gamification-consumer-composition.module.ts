/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/gamification-consumer-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires owner consumption capabilities through minimal existence and balance ports.
 *
 * 🧠 Responsibilities:
 * • binds real recipient, balance and manual-award dependencies;
 * • shares immutable scalar adapters without feature-to-feature service injection.
 *
 * 🏗️ Architecture:
 * Root runtime composition; owners retain all policy and persistence.
 *
 * ⚠️ Important:
 * This assembly creates no queue, worker, scheduler, HTTP listener or automatic awards.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { EventsModule } from '@api/core/events';
import { UsersExistenceModule } from '@api/modules/users';
import { PrismaTransactionalProfileExistenceReader } from '@api/modules/users/infrastructure';
import {
  CommunityPointsRuntimeModule,
  POINTS_RECIPIENT_EXISTENCE,
} from '@api/modules/community-points';
import {
  LevelsRuntimeModule,
  LEVEL_RECIPIENT_EXISTENCE,
  LEVEL_POINTS_BALANCE_READER,
} from '@api/modules/levels';
import {
  AchievementsRuntimeModule,
  ACHIEVEMENT_RECIPIENT_EXISTENCE,
  MANUAL_AWARD_TRANSACTION,
} from '@api/modules/achievements';
import { PrismaManualAwardWriter } from '@api/modules/achievements/infrastructure';
import { RecipientExistenceAdapter } from './infrastructure/recipient-existence.adapter';
import { LevelPointsBalanceAdapter } from './infrastructure/level-points-balance.adapter';
import { PrismaManualAwardTransaction } from './infrastructure/prisma-manual-award.transaction';

@Global()
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EventsModule,
    UsersExistenceModule,
    CommunityPointsRuntimeModule,
    LevelsRuntimeModule,
    AchievementsRuntimeModule,
  ],
  providers: [
    PrismaTransactionalProfileExistenceReader,
    PrismaManualAwardWriter,
    {
      provide: MANUAL_AWARD_TRANSACTION,
      useClass: PrismaManualAwardTransaction,
    },
    RecipientExistenceAdapter,
    {
      provide: POINTS_RECIPIENT_EXISTENCE,
      useExisting: RecipientExistenceAdapter,
    },
    {
      provide: LEVEL_RECIPIENT_EXISTENCE,
      useExisting: RecipientExistenceAdapter,
    },
    {
      provide: ACHIEVEMENT_RECIPIENT_EXISTENCE,
      useExisting: RecipientExistenceAdapter,
    },
    LevelPointsBalanceAdapter,
    {
      provide: LEVEL_POINTS_BALANCE_READER,
      useExisting: LevelPointsBalanceAdapter,
    },
  ],
  exports: [
    CommunityPointsRuntimeModule,
    LevelsRuntimeModule,
    AchievementsRuntimeModule,
    POINTS_RECIPIENT_EXISTENCE,
    LEVEL_RECIPIENT_EXISTENCE,
    ACHIEVEMENT_RECIPIENT_EXISTENCE,
    LEVEL_POINTS_BALANCE_READER,
    MANUAL_AWARD_TRANSACTION,
  ],
})
export class GamificationConsumerCompositionModule {}

/** No queue has launched. The accountants are only taking their seats. */
