/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/src/core/events/types/event-envelope.type.ts
 *
 * 🎯 Purpose:
 * Defines the versioned envelope shared by durable DSS integration events.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { JsonValue } from './json-value.type';

export type EventCategory = 'domain' | 'integration' | 'system';

export type EventEnvelope<TPayload extends JsonValue = JsonValue> = {
  id: string;
  name: string;
  version: number;
  category: EventCategory;
  producer: string;
  occurredAt: string;
  payload: TPayload;
  aggregate?: {
    type: string;
    id: string;
  };
  correlationId?: string;
  causationId?: string;
  actorId?: string;
  metadata?: Record<string, JsonValue>;
};
