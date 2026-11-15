/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Levels Synchronization Composition
 * 📄 File: apps/api/src/composition/gamification/level-synchronization-composition.module.ts
 * 🎯 Purpose: Shares one narrow synchronization adapter across API/runtime hosts.
 * 🧠 Responsibilities: Owns root provider wiring while feature policy stays private.
 * 🏗️ Architecture: Global root port binding; no feature application, route or scheduler.
 * ⚠️ Important: Importing this module does not start automatic event consumption.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { EventsModule } from '@api/core/events';
import { LEVEL_SYNCHRONIZATION } from '@api/modules/levels';
import { PrismaLevelSynchronizationWriter } from '@api/modules/levels/infrastructure';
import { PrismaTransactionalPointsBalanceReader } from '@api/modules/community-points/infrastructure';
import { PrismaLevelSynchronizationTransaction } from './infrastructure/prisma-level-synchronization.transaction';

@Global()
@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    PrismaLevelSynchronizationWriter,
    PrismaTransactionalPointsBalanceReader,
    {
      provide: LEVEL_SYNCHRONIZATION,
      useClass: PrismaLevelSynchronizationTransaction,
    },
  ],
  exports: [LEVEL_SYNCHRONIZATION],
})
export class LevelSynchronizationCompositionModule {}
