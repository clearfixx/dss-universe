/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Events Persistence
 * 📄 File: apps/api/src/core/events/infrastructure.ts
 * 🎯 Purpose: Publishes only named coordinate fragments for technical composition.
 * 🧠 Responsibilities: Keeps source SQL ownership out of routing orchestration.
 * 🏗️ Architecture: Infrastructure-only entry; no payload or mutable service.
 * ⚠️ Important: Not an application/business API.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  outboxRoutingUpper,
  outboxRoutingWindow,
} from './infrastructure/outbox-routing-source';
