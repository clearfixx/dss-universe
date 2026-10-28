/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/community-points-runtime.module.ts
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
import { CommunityPointsService } from './application/services/community-points.service';
import {
  CommunityPointsProvidersModule,
  COMMUNITY_POINTS_INTERNAL_BALANCE_READER,
} from './community-points-providers.module';
import {
  COMMUNITY_POINTS_EVENT_CONSUMER,
  type CommunityPointsEventConsumer,
} from './contracts/event-consumer.contract';
import { COMMUNITY_POINTS_BALANCE_READER } from './contracts/balance-reader.contract';

@Module({
  imports: [CommunityPointsProvidersModule],
  providers: [
    {
      provide: COMMUNITY_POINTS_EVENT_CONSUMER,
      inject: [CommunityPointsService],
      useFactory: (
        service: CommunityPointsService,
      ): CommunityPointsEventConsumer =>
        Object.freeze({
          consume: async (event: IntegrationEventJob): Promise<void> => {
            await service.consume(event);
          },
        }),
    },
    {
      provide: COMMUNITY_POINTS_BALANCE_READER,
      useExisting: COMMUNITY_POINTS_INTERNAL_BALANCE_READER,
    },
  ],
  exports: [COMMUNITY_POINTS_EVENT_CONSUMER, COMMUNITY_POINTS_BALANCE_READER],
})
export class CommunityPointsRuntimeModule {}
