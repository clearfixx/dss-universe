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
import { CanonicalOutboxReader } from './infrastructure/canonical-outbox.reader';

@Global()
@Module({
  providers: [OutboxWriterService, CanonicalOutboxReader],
  exports: [OutboxWriterService, CanonicalOutboxReader],
})
export class EventsModule {}
