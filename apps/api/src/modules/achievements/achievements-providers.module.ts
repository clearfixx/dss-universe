/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/achievements-providers.module.ts
 *
 * 🎯 Purpose:
 * Shares one private service/repository graph across API and runtime assemblies.
 *
 * 🧠 Responsibilities:
 * • owns exactly one service and repository registration;
 * • makes provider lifetimes reusable without presentation.
 *
 * 🏗️ Architecture:
 * Private owner assembly; not exported from the public module index.
 *
 * ⚠️ Important:
 * Only owner wrappers consume these private exports; no automatic processing starts here.
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

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    AchievementsService,
    {
      provide: ACHIEVEMENTS_REPOSITORY,
      useClass: PrismaAchievementsRepository,
    },
  ],
  exports: [AchievementsService],
})
export class AchievementsProvidersModule {}
