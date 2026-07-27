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
import { ACTIVITY_REPOSITORY } from './domain/repositories/activity.repository.interface';
import { PrismaActivityRepository } from './infrastructure/repositories/prisma-activity.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    ActivityFeedService,
    {
      provide: ACTIVITY_REPOSITORY,
      useClass: PrismaActivityRepository,
    },
  ],
  exports: [ActivityFeedService],
})
export class ActivityModule {}

/**
 * Activity is a projection platform, not a new owner of everybody else's data.
 */
