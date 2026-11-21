/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/moderation-sanction.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies pure sanction normalization, expiry, activity and escalation rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ModerationSanctionError } from './errors/moderation-sanction.error';
import {
  addDays,
  countsTowardEscalation,
  DEFAULT_MODERATION_SANCTION_POLICY,
  isSanctionActive,
  normalizeSanctionContext,
  normalizeSanctionReason,
  readOnlyExpiry,
  shouldEscalate,
  validateSanctionPolicy,
} from './moderation-sanction.rules';

describe('moderation sanction rules', () => {
  const now = new Date('2026-11-20T10:00:00Z');
  const policy = DEFAULT_MODERATION_SANCTION_POLICY;

  it('uses the owner-approved defaults', () => {
    expect(policy).toEqual({
      warningLifetimeDays: 30,
      escalationWarningCount: 3,
      escalationReadOnlyDays: 7,
      readOnlyMaxDays: 365,
    });
  });

  it.each(['', '  ', 'ab', 'x'.repeat(1001)])(
    'rejects reason %j outside 3–1000 characters',
    (reason) => {
      expect(() => normalizeSanctionReason(reason)).toThrow(
        ModerationSanctionError,
      );
    },
  );

  it('trims a valid reason', () => {
    expect(normalizeSanctionReason('  Flood in topic  ')).toBe(
      'Flood in topic',
    );
  });

  it('accepts an absent or empty context', () => {
    expect(normalizeSanctionContext(null)).toBeNull();
    expect(
      normalizeSanctionContext({ type: ' ', id: '', path: null }),
    ).toBeNull();
  });

  it('normalizes a complete owner context', () => {
    expect(
      normalizeSanctionContext({
        type: 'forum.post',
        id: ' p-1 ',
        path: '/community/t/1#p4663',
      }),
    ).toEqual({ type: 'forum.post', id: 'p-1', path: '/community/t/1#p4663' });
  });

  it.each([
    { type: 'forum.post', id: '' },
    { type: '', id: 'p-1' },
    { type: 'Forum.Post', id: 'p-1' },
    { type: 'forum.post', id: 'p-1', path: 'https://evil.example/x' },
    { type: 'forum.post', id: 'p-1', path: '//evil.example/x' },
    { type: 'forum.post', id: 'p-1', path: '/a b' },
    { type: 'forum.post', id: 'p-1', path: '/a\\b' },
  ])('rejects malformed context %j', (context) => {
    expect(() => normalizeSanctionContext(context)).toThrow(
      ModerationSanctionError,
    );
  });

  it('validates policy bounds', () => {
    expect(() => validateSanctionPolicy(policy)).not.toThrow();
    for (const invalid of [
      { ...policy, warningLifetimeDays: 0 },
      { ...policy, escalationWarningCount: 1 },
      { ...policy, escalationReadOnlyDays: 366 },
      { ...policy, readOnlyMaxDays: 3651 },
      { ...policy, warningLifetimeDays: 1.5 },
    ]) {
      expect(() => validateSanctionPolicy(invalid)).toThrow(
        ModerationSanctionError,
      );
    }
  });

  it('requires a future read-only expiry within the policy maximum', () => {
    expect(readOnlyExpiry(addDays(now, 1), now, policy)).toEqual(
      addDays(now, 1),
    );
    expect(readOnlyExpiry(addDays(now, 365), now, policy)).toEqual(
      addDays(now, 365),
    );
    for (const invalid of [
      now,
      addDays(now, -1),
      addDays(now, 366),
      new Date(NaN),
    ]) {
      expect(() => readOnlyExpiry(invalid, now, policy)).toThrow(
        ModerationSanctionError,
      );
    }
  });

  it('treats revoked and expired sanctions as inactive', () => {
    const base = { revokedAt: null, expiresAt: addDays(now, 1) };
    expect(isSanctionActive(base, now)).toBe(true);
    expect(isSanctionActive({ ...base, expiresAt: now }, now)).toBe(false);
    expect(isSanctionActive({ ...base, revokedAt: now }, now)).toBe(false);
  });

  it('counts only active unconsumed warnings toward escalation', () => {
    const warning = {
      kind: 'WARNING' as const,
      revokedAt: null,
      expiresAt: addDays(now, 1),
      consumedAt: null,
    };
    expect(countsTowardEscalation(warning, now)).toBe(true);
    expect(countsTowardEscalation({ ...warning, consumedAt: now }, now)).toBe(
      false,
    );
    expect(countsTowardEscalation({ ...warning, kind: 'READ_ONLY' }, now)).toBe(
      false,
    );
    expect(countsTowardEscalation({ ...warning, expiresAt: now }, now)).toBe(
      false,
    );
  });

  it('escalates at the configured threshold', () => {
    expect(shouldEscalate(2, policy)).toBe(false);
    expect(shouldEscalate(3, policy)).toBe(true);
    expect(shouldEscalate(4, { ...policy, escalationWarningCount: 5 })).toBe(
      false,
    );
  });
});
