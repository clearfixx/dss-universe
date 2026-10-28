/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/levels-runtime.module.ts
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
 * The facade invokes only the existing owner command and preserves rejection identity.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import type { IntegrationEventJob } from '@dss/jobs';
import { LevelsService } from './application/services/levels.service';
import { LevelsProvidersModule } from './levels-providers.module';
import {
  LEVEL_EVENT_CONSUMER,
  type LevelEventConsumer,
} from './contracts/event-consumer.contract';

@Module({
  imports: [LevelsProvidersModule],
  providers: [
    {
      provide: LEVEL_EVENT_CONSUMER,
      inject: [LevelsService],
      useFactory: (service: LevelsService): LevelEventConsumer =>
        Object.freeze({
          consume: async (event: IntegrationEventJob): Promise<void> => {
            await service.consume(event);
          },
        }),
    },
  ],
  exports: [LEVEL_EVENT_CONSUMER],
})
export class LevelsRuntimeModule {}
