/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/achievements.module.ts
 *
 * 🎯 Purpose:
 * Wires the event-driven Achievements bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';

import { AchievementsService } from './application/services/achievements.service';
import { ACHIEVEMENTS_REPOSITORY } from './domain/repositories/achievements.repository.interface';
import { PrismaAchievementsRepository } from './infrastructure/repositories/prisma-achievements.repository';
import { AchievementsResolver } from './presentation/graphql/resolvers/achievements.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    AchievementsService,
    AchievementsResolver,
    {
      provide: ACHIEVEMENTS_REPOSITORY,
      useClass: PrismaAchievementsRepository,
    },
  ],
  exports: [],
})
export class AchievementsModule {}

/**
 * This module recognizes milestones. It does not manufacture authority.
 */
