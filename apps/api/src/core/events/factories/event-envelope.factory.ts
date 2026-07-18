/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/src/core/events/factories/event-envelope.factory.ts
 *
 * 🎯 Purpose:
 * Creates valid, uniquely identified and timestamped event envelopes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { randomUUID } from 'node:crypto';

import type { EventEnvelope } from '../types/event-envelope.type';
import type { JsonValue } from '../types/json-value.type';

type CreateEventEnvelopeInput<TPayload extends JsonValue> = Omit<
  EventEnvelope<TPayload>,
  'id' | 'occurredAt'
> & {
  id?: string;
  occurredAt?: Date | string;
};

export function createEventEnvelope<TPayload extends JsonValue>(
  input: CreateEventEnvelopeInput<TPayload>,
): EventEnvelope<TPayload> {
  if (!input.name.trim() || !input.producer.trim()) {
    throw new Error('Event name and producer are required.');
  }

  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error('Event version must be a positive integer.');
  }

  return {
    ...input,
    id: input.id ?? randomUUID(),
    occurredAt:
      input.occurredAt instanceof Date
        ? input.occurredAt.toISOString()
        : (input.occurredAt ?? new Date().toISOString()),
  };
}
