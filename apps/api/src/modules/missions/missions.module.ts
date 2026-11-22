/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions
 * 📄 File: apps/api/src/modules/missions/missions.module.ts
 *
 * 🎯 Purpose:
 * Nest wiring of community missions.
 *
 * ⚠️ Important:
 * MISSION_METRIC_READER is provided globally by the content-read
 * composition; this module exports nothing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { MissionsService } from './infrastructure/prisma-missions.service';
import { MissionsResolver } from './presentation/missions.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [MissionsService, MissionsResolver],
  exports: [],
})
export class MissionsModule {}
