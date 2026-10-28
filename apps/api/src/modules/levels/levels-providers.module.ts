/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/levels-providers.module.ts
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
import { LevelsService } from './application/services/levels.service';
import { LEVELS_REPOSITORY } from './domain/repositories/levels.repository.interface';
import { PrismaLevelsRepository } from './infrastructure/repositories/prisma-levels.repository';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    LevelsService,
    { provide: LEVELS_REPOSITORY, useClass: PrismaLevelsRepository },
  ],
  exports: [LevelsService],
})
export class LevelsProvidersModule {}
