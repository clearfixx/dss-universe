/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/achievements-runtime.module.ts
 *
 * 🎯 Purpose:
 * Exposes narrow event consumption over the shared owner provider graph.
 *
 * 🧠 Responsibilities:
 * • publishes only the declared owner capabilities;
 * • delegates events without changing rules or swallowing errors.
 *
 * 🏗️ Architecture:
 * Headless-capable owner wrapper; contains no queue, resolver or scheduler.
 *
 * ⚠️ Important:
 * Facades expose owner commands without queue startup and preserve unknown rejection identity.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import type { IntegrationEventJob } from '@dss/jobs';
import { AchievementsService } from './application/services/achievements.service';
import { AchievementsProvidersModule } from './achievements-providers.module';
import { QualifiedAchievementsService } from './application/services/qualified-achievements.service';
import type { QualifiedAchievementCommand } from './domain/types/qualified-achievement.type';
import {
  QUALIFIED_ACHIEVEMENT_CONSUMER,
  type QualifiedAchievementConsumer,
} from './contracts/qualified-consumer.contract';
import {
  ACHIEVEMENT_EVENT_CONSUMER,
  type AchievementEventConsumer,
} from './contracts/event-consumer.contract';

@Module({
  imports: [AchievementsProvidersModule],
  providers: [
    {
      provide: QUALIFIED_ACHIEVEMENT_CONSUMER,
      inject: [QualifiedAchievementsService],
      useFactory: (
        service: QualifiedAchievementsService,
      ): QualifiedAchievementConsumer =>
        Object.freeze({
          advance: (command: QualifiedAchievementCommand) =>
            service.advance(command),
        }),
    },
    {
      provide: ACHIEVEMENT_EVENT_CONSUMER,
      inject: [AchievementsService],
      useFactory: (service: AchievementsService): AchievementEventConsumer =>
        Object.freeze({
          consume: async (event: IntegrationEventJob): Promise<void> => {
            await service.consume(event);
          },
        }),
    },
  ],
  exports: [ACHIEVEMENT_EVENT_CONSUMER, QUALIFIED_ACHIEVEMENT_CONSUMER],
})
export class AchievementsRuntimeModule {}
