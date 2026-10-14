/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/activity.module.ts
 *
 * 🎯 Purpose:
 * Wires the shared Activity projection read boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { ActivityFeedService } from './application/services/activity-feed.service';
import { ActivityFeedRankerService } from './application/services/activity-feed-ranker.service';
import { ActorActivityReaderService } from './application/services/actor-activity-reader.service';
import { ACTOR_ACTIVITY_READER } from './contracts/actor-activity-reader.contract';
import { ACTIVITY_REPOSITORY } from './domain/repositories/activity.repository.interface';
import { PrismaActivityRepository } from './infrastructure/repositories/prisma-activity.repository';
import { ActivityFeedResolver } from './presentation/graphql/resolvers/activity-feed.resolver';

@Module({
  imports: [PrismaModule],
  providers: [
    ActivityFeedService,
    ActivityFeedRankerService,
    ActorActivityReaderService,
    { provide: ACTOR_ACTIVITY_READER, useExisting: ActorActivityReaderService },
    ActivityFeedResolver,
    {
      provide: ACTIVITY_REPOSITORY,
      useClass: PrismaActivityRepository,
    },
  ],
  exports: [ACTOR_ACTIVITY_READER],
})
export class ActivityModule {}

/**
 * Activity is a projection platform, not a new owner of everybody else's data.
 */
