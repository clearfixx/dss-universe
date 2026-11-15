/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/application/services/qualified-achievement-validation.spec.ts
 * 🎯 Purpose: Verifies fail-closed qualification boundaries before persistence.
 * 🧠 Responsibilities: Covers malformed envelopes, unsafe scalar projections and bounded metadata batches.
 * 🏗️ Architecture: Pure owner contract tests; no producer attestation or infrastructure substitutes.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { QualificationBlockedError } from '../../domain/errors/qualification-blocked.error';
import type { QualifiedAchievementCommand } from '../../domain/types/qualified-achievement.type';
import { validateQualifiedAchievementCommand } from './qualified-achievement-validation';

function command(): QualifiedAchievementCommand {
  return {
    event: {
      eventId: 'event',
      eventName: 'synthetic.created.v1',
      eventVersion: 1,
      producer: 'synthetic',
      sourceType: 'Synthetic',
      sourceId: 'source',
      occurredAt: '2026-11-08T12:00:00.000Z',
      payload: { userId: 'subject' },
    },
    facts: [
      {
        producer: 'synthetic',
        sourceKind: 'Synthetic',
        sourceId: 'source',
        factId: 'fact',
        canonicalEventId: 'event',
        revision: '1',
        action: 'QUALIFY',
        qualificationId: 'qualification',
        qualificationRevision: '1',
        qualificationEventId: 'event',
        qualificationFactId: 'fact',
        retiredThroughRevision: '0',
        predecessorWithdrawalFactId: null,
        contractVersion: 1,
      },
    ],
    contribution: { producer: 'synthetic', factId: 'fact' },
  };
}

describe('Qualified achievement input boundary', () => {
  it.each([undefined, null, false, [], {}, { event: {}, facts: [] }])(
    'rejects malformed envelope %j with an owned failure',
    (input) => {
      expect(() => validateQualifiedAchievementCommand(input)).toThrow(
        QualificationBlockedError,
      );
    },
  );

  it.each([NaN, Infinity, { body: 'private document' }, ['nested'], undefined])(
    'rejects unsafe payload value %j',
    (scalar) => {
      const valid = command();
      expect(() =>
        validateQualifiedAchievementCommand({
          ...valid,
          event: {
            ...valid.event,
            payload: { userId: 'subject', unsafe: scalar },
          },
        }),
      ).toThrow(QualificationBlockedError);
    },
  );

  it('allows64 metadata records and rejects65 before owner work', () => {
    const valid = command();
    expect(() =>
      validateQualifiedAchievementCommand({
        ...valid,
        facts: Array(64).fill(valid.facts[0]),
      }),
    ).not.toThrow();
    expect(() =>
      validateQualifiedAchievementCommand({
        ...valid,
        facts: Array(65).fill(valid.facts[0]),
      }),
    ).toThrow(QualificationBlockedError);
    const mapping = {
      awardId: 'award',
      qualification: valid.contribution,
      evidenceId: 'review',
      evidenceDigest: '0'.repeat(64),
    };
    expect(() =>
      validateQualifiedAchievementCommand({
        ...valid,
        mappings: Array(64).fill(mapping),
      }),
    ).not.toThrow();
    expect(() =>
      validateQualifiedAchievementCommand({
        ...valid,
        mappings: Array(65).fill(mapping),
      }),
    ).toThrow(QualificationBlockedError);
  });

  it('rejects unresolved contributions and malformed facts', () => {
    const valid = command();
    for (const facts of [
      [null],
      [{ ...valid.facts[0], action: 'OTHER' }],
      [{ ...valid.facts[0], qualificationRevision: '2' }],
    ]) {
      expect(() =>
        validateQualifiedAchievementCommand({ ...valid, facts }),
      ).toThrow(QualificationBlockedError);
    }
    expect(() =>
      validateQualifiedAchievementCommand({
        ...valid,
        contribution: { producer: 'synthetic', factId: 'unknown' },
      }),
    ).toThrow(QualificationBlockedError);
  });
});
