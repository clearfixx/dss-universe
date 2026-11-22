/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Events
 * 📄 File: apps/api/src/modules/events/events.module.ts
 *
 * 🎯 Purpose:
 * Nest wiring of community events.
 *
 * ⚠️ Important:
 * Exports nothing; other modules learn about events from the outbox.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { CommunityEventsService } from './infrastructure/prisma-events.service';
import { CommunityEventsResolver } from './presentation/events.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [CommunityEventsService, CommunityEventsResolver],
  exports: [],
})
export class CommunityEventsModule {}
