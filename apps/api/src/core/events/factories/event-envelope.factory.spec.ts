/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events Tests
 * 📄 File: apps/api/src/core/events/factories/event-envelope.factory.spec.ts
 *
 * 🎯 Purpose:
 * Verifies stable event-envelope identity, timestamps and version rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { createEventEnvelope } from './event-envelope.factory';

describe('createEventEnvelope', () => {
  it('creates a versioned envelope with deterministic supplied context', () => {
    const event = createEventEnvelope({
      id: 'ef31a169-c5a2-4fef-a581-837f549cb17c',
      name: 'iam.permission.created',
      version: 1,
      category: 'integration',
      producer: 'iam',
      occurredAt: new Date('2026-07-18T06:00:00.000Z'),
      correlationId: 'request-42',
      payload: { permissionKey: 'phase4.audit' },
    });

    expect(event).toEqual({
      id: 'ef31a169-c5a2-4fef-a581-837f549cb17c',
      name: 'iam.permission.created',
      version: 1,
      category: 'integration',
      producer: 'iam',
      occurredAt: '2026-07-18T06:00:00.000Z',
      correlationId: 'request-42',
      payload: { permissionKey: 'phase4.audit' },
    });
  });

  it('rejects invalid event versions', () => {
    expect(() =>
      createEventEnvelope({
        name: 'iam.permission.created',
        version: 0,
        category: 'integration',
        producer: 'iam',
        payload: {},
      }),
    ).toThrow('Event version must be a positive integer.');
  });
});
