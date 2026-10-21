/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/src/core/events/events.module.ts
 *
 * 🎯 Purpose:
 * Exposes the durable event contracts and transactional outbox writer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Global, Module } from '@nestjs/common';

import { OutboxWriterService } from './services/outbox-writer.service';

@Global()
@Module({
  providers: [OutboxWriterService],
  exports: [OutboxWriterService],
})
export class EventsModule {}
