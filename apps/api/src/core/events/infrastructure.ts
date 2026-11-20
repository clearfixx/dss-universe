/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Events Persistence
 * 📄 File: apps/api/src/core/events/infrastructure.ts
 * 🎯 Purpose: Publishes bounded canonical readers and coordinate fragments for root composition.
 * 🧠 Responsibilities: Keeps Outbox parsing and source SQL within Core ownership.
 * 🏗️ Architecture: Infrastructure-only entry; no unrestricted payload or business API.
 * ⚠️ Important: Not an application/business API.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  outboxRoutingUpper,
  outboxRoutingWindow,
} from './infrastructure/outbox-routing-source';
export {
  CanonicalOutboxReader,
  type CanonicalOutboxEvidence,
} from './infrastructure/canonical-outbox.reader';
