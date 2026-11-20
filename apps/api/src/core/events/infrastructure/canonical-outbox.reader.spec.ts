/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Events Tests
 * 📄 File: apps/api/src/core/events/infrastructure/canonical-outbox.reader.spec.ts
 * 🎯 Purpose: Pins scalar evidence projection without coercion or unrestricted JSON output.
 * 🏗️ Architecture: Pure parser and technical failure tests; no source-owner mocks.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';
import {
  CanonicalOutboxReader,
  projectCanonicalEvidence,
} from './canonical-outbox.reader';

const row = {
  id: 'event',
  producer: 'synthetic',
  eventName: 'synthetic.v1',
  eventVersion: 1,
  eventCategory: 'integration',
  aggregateType: 'Synthetic',
  aggregateId: 'entry',
  actorId: 'subject',
  occurredAt: new Date('2026-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:01Z'),
  payload: {},
};

describe('Canonical Outbox evidence', () => {
  it('projects selected payload and metadata without exposing unrelated fields', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...row,
      payload: { recipientId: 'subject', privateText: { secret: true } },
      metadata: { contributionFactId: 'fact', privateText: 'secret' },
    });
    const transaction = {
      outboxEvent: { findUnique },
    } as unknown as TransactionClient;
    const reader = new CanonicalOutboxReader();
    expect(
      (await reader.readSelected(transaction, 'event', ['recipientId']))
        ?.payload,
    ).toEqual({ recipientId: 'subject' });
    expect(
      await reader.metadataSelected(transaction, 'event', [
        'contributionFactId',
      ]),
    ).toEqual({ contributionFactId: 'fact' });
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { id: 'event' },
      select: { metadata: true },
    });
  });

  it('preserves ambiguous candidates including malformed selected values', async () => {
    const query = jest.fn().mockResolvedValue([
      { ...row, payload: { recipientId: 'subject', secret: 'omitted' } },
      { ...row, id: 'other', payload: { recipientId: {} } },
    ]);
    const transaction = { $queryRaw: query } as unknown as TransactionClient;
    const result = await new CanonicalOutboxReader().candidatesSelected(
      transaction,
      {
        producer: 'synthetic',
        aggregateType: 'Synthetic',
        aggregateId: 'entry',
        eventName: 'synthetic.v1',
      },
      ['recipientId'],
    );
    expect(result.map((entry) => entry.payload)).toEqual([
      { recipientId: 'subject' },
      null,
    ]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid selected descriptors before querying storage', async () => {
    const findUnique = jest.fn();
    const transaction = {
      outboxEvent: { findUnique },
    } as unknown as TransactionClient;
    const reader = new CanonicalOutboxReader();
    await expect(
      reader.readSelected(transaction, 'event', ['id', 'id']),
    ).rejects.toThrow('Invalid canonical evidence descriptor');
    await expect(
      reader.metadataSelected(transaction, 'event', ['id', 'id']),
    ).rejects.toThrow('Invalid canonical metadata descriptor');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('keeps scalar types and excludes unknown envelope fields', () => {
    const evidence = projectCanonicalEvidence(
      { ...row, payload: { value: '1', recipientId: 'subject' } },
      ['value', 'recipientId'],
    );
    expect(evidence.payload).toEqual({ value: '1', recipientId: 'subject' });
    expect(evidence.payload?.value).not.toBe(1);
    expect(Object.keys(evidence).sort()).toEqual([
      'actorId',
      'aggregateId',
      'aggregateType',
      'category',
      'createdAt',
      'eventId',
      'name',
      'occurredAt',
      'payload',
      'producer',
      'version',
    ]);
  });
  it.each([
    null,
    [],
    1,
    'text',
    { value: {} },
    { value: [] },
    { value: Number.NaN },
    { value: 1, secret: 'synthetic' },
  ])('returns explicit invalid payload for %p', (payload) => {
    expect(
      projectCanonicalEvidence({ ...row, payload }, ['value']).payload,
    ).toBeNull();
  });
  it('rejects oversized and duplicate descriptor keys', () => {
    expect(() =>
      projectCanonicalEvidence(
        row,
        Array.from({ length: 9 }, (_, i) => String(i)),
      ),
    ).toThrow('Invalid canonical evidence descriptor');
    expect(() => projectCanonicalEvidence(row, ['value', 'value'])).toThrow(
      'Invalid canonical evidence descriptor',
    );
  });
  it('preserves query failure identity instead of returning missing evidence', async () => {
    const failure = new Error('Synthetic storage failure');
    const transaction = {
      $queryRaw: jest.fn().mockRejectedValue(failure),
      outboxEvent: { findUnique: jest.fn().mockRejectedValue(failure) },
    } as unknown as TransactionClient;
    const reader = new CanonicalOutboxReader();
    await expect(reader.read(transaction, 'event', ['value'])).rejects.toBe(
      failure,
    );
    await expect(
      reader.candidates(
        transaction,
        {
          producer: 'synthetic',
          aggregateType: 'Synthetic',
          aggregateId: 'entry',
          eventName: 'synthetic.v1',
        },
        ['value'],
      ),
    ).rejects.toBe(failure);
  });
});
