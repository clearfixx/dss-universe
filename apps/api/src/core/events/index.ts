/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/src/core/events/index.ts
 *
 * 🎯 Purpose:
 * Defines the public API of the Core Events platform capability.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export * from './events.module';
export * from './factories/event-envelope.factory';
export * from './services/outbox-writer.service';
export type { EventCategory, EventEnvelope } from './types/event-envelope.type';
export type { JsonPrimitive, JsonValue } from './types/json-value.type';
