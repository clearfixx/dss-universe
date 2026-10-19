/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Queue
 * 📄 File: apps/api/src/core/queue/index.ts
 *
 * 🎯 Purpose:
 * Publishes only the existing named queue infrastructure operations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { QueueModule } from './queue.module';
export { OutboxDispatcherService } from './services/outbox-dispatcher.service';
export { QueueRegistryService } from './services/queue-registry.service';
export { QueueOperationsService } from './services/queue-operations.service';
