/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Admission Codec Verification
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/admission-seal.codec.spec.ts
 * 🎯 Purpose: Proves safe encoding, exact limits and stored-seal tamper rejection.
 * 🧠 Responsibilities: Exercises hostile shapes without invoking their getters or owner effects.
 * 🏗️ Architecture: Deterministic unit regressions; real producer attestation remains separate.
 * ⚠️ Important: Accepted synthetic bytes are not a production admission.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  encodeAdmissionSeal,
  verifyAdmissionSeal,
} from './admission-seal.codec';
import { AdmissionCodecError } from './admission-codec.error';
import type { VerifiedAchievementMapping } from '@api/modules/achievements';

const eventId = '10000000-0000-0000-0000-000000000001';
const factId = '20000000-0000-0000-0000-000000000001';
function fixture(reversed = false) {
  const canonical = {
    eventId,
    eventName: reversed
      ? 'reputation.direct.reversed.v1'
      : 'reputation.direct.changed.v1',
    eventVersion: 1,
    producer: 'dss.api.reputation',
    sourceType: 'ReputationEntry',
    sourceId: 'opaque-entry-🛰️',
    occurredAt: '2026-11-09T00:00:00.000Z',
  };
  return {
    codecVersion: 1,
    destination: 'gamification.v1',
    descriptor: { id: 'reputation.qualification', version: 1 },
    canonical,
    applicability: { POINTS: false, LEVELS: false, ACHIEVEMENTS: true },
    inputs: {
      ACHIEVEMENTS: {
        codec: 'achievements.qualified.v1',
        command: {
          event: {
            ...canonical,
            payload: {
              recipientId: 'opaque-recipient',
              value: reversed ? -1 : 1,
              ...(reversed ? { reversesEntryId: 'opaque-original' } : {}),
            },
          },
          facts: [
            {
              producer: 'dss.api.reputation',
              sourceKind: 'ReputationEntry',
              sourceId: 'opaque-entry',
              factId,
              canonicalEventId: eventId,
              revision: reversed ? '2' : '1',
              action: reversed ? 'WITHDRAW' : 'QUALIFY',
              qualificationId: factId,
              qualificationRevision: '1',
              qualificationEventId: eventId,
              qualificationFactId: factId,
              retiredThroughRevision: reversed ? '1' : '0',
              predecessorWithdrawalFactId: null,
              contractVersion: 1,
            },
          ],
          contribution: { producer: 'dss.api.reputation', factId },
          mappings: [] as VerifiedAchievementMapping[],
        },
      },
    },
  };
}
function rejects(value: unknown, code = 'INVALID_QUALIFIED_PROJECTION') {
  try {
    encodeAdmissionSeal(value);
  } catch (error) {
    expect(error).toBeInstanceOf(AdmissionCodecError);
    expect(error).toMatchObject({ code, message: code });
    return;
  }
  throw new Error('Expected controlled seal rejection.');
}

describe('Inactive Reputation admission seal codec', () => {
  it('emits lexically ordered keys rather than relying on producer insertion order', () => {
    const encoded = encodeAdmissionSeal(fixture());
    const record = JSON.parse(encoded.bytes.toString('utf8')) as Record<
      string,
      unknown
    >;
    expect(Object.keys(record)).toEqual([
      'applicability',
      'canonical',
      'codecVersion',
      'descriptor',
      'destination',
      'inputs',
    ]);
    expect(Object.keys(record.canonical as object)).toEqual([
      'eventId',
      'eventName',
      'eventVersion',
      'occurredAt',
      'producer',
      'sourceId',
      'sourceType',
    ]);
  });

  it('accepts the bounded three-fact cohort without requiring optional mappings', () => {
    const input = fixture(true);
    const owned = input.inputs.ACHIEVEMENTS.command;
    owned.facts = Array.from({ length: 3 }, (_, index) => ({
      ...owned.facts[0],
      factId: `20000000-0000-0000-0000-00000000000${index + 1}`,
    }));
    Reflect.deleteProperty(owned, 'mappings');
    const encoded = encodeAdmissionSeal(input);
    expect(encoded.projection.inputs.ACHIEVEMENTS.command.facts).toHaveLength(
      3,
    );
    expect(
      Object.hasOwn(encoded.projection.inputs.ACHIEVEMENTS.command, 'mappings'),
    ).toBe(false);
  });

  it('rejects cyclic or missing data before recursive canonical encoding', () => {
    const cyclic = fixture();
    Object.assign(cyclic, { inputs: cyclic });
    rejects(cyclic);
    const missing = fixture();
    Reflect.deleteProperty(
      missing.inputs.ACHIEVEMENTS.command.event.payload,
      'recipientId',
    );
    rejects(missing);
  });

  it.each([false, true])(
    'round-trips the closed direct/reversal format: %s',
    (reversed) => {
      const input = fixture(reversed);
      const encoded = encodeAdmissionSeal(input);
      expect(
        verifyAdmissionSeal(
          JSON.parse(encoded.bytes.toString('utf8')),
          encoded.digest,
          encoded.encodedBytes,
        ),
      ).toEqual(input);
      expect(encoded.digest).toHaveLength(32);
      expect(encoded.encodedBytes).toBe(Buffer.byteLength(encoded.bytes));
    },
  );

  it('ignores input key insertion order, never input data, and copies the projection', () => {
    const input = fixture();
    const reordered = Object.fromEntries(Object.entries(input).reverse());
    const first = encodeAdmissionSeal(input);
    const second = encodeAdmissionSeal(reordered);
    expect(first.bytes).toEqual(second.bytes);
    expect(first.digest).toEqual(second.digest);
    input.canonical.sourceId = 'mutated-after-encoding';
    input.inputs.ACHIEVEMENTS.command.facts[0].sourceId =
      'mutated-after-encoding';
    expect(first.projection.canonical.sourceId).toBe('opaque-entry-🛰️');
    expect(first.projection.inputs.ACHIEVEMENTS.command.facts[0].sourceId).toBe(
      'opaque-entry',
    );
  });

  it.each([null, [], 1, 'text', false])(
    'rejects a non-record envelope: %p',
    (input) => rejects(input),
  );

  it('rejects unknown content and metadata at outer and payload boundaries', () => {
    rejects({ ...fixture(), metadata: { secret: 'never-copy-this' } });
    const input = fixture();
    Object.assign(input.inputs.ACHIEVEMENTS.command.event.payload, {
      reason: 'never-copy-this',
    });
    rejects(input);
  });

  it('rejects accessors without evaluating them', () => {
    const input = fixture();
    const getter = jest.fn(() => 'never-read-this');
    Object.defineProperty(
      input.inputs.ACHIEVEMENTS.command.event.payload,
      'recipientId',
      { enumerable: true, get: getter },
    );
    rejects(input);
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects custom prototypes, symbols and non-enumerable fields', () => {
    const inherited = Object.assign(
      Object.create({ hidden: true }) as object,
      fixture(),
    );
    rejects(inherited);
    const symbol = fixture();
    Object.defineProperty(symbol, Symbol('secret'), { value: 'hidden' });
    rejects(symbol);
    const invisible = fixture();
    Object.defineProperty(invisible, 'codecVersion', {
      value: 1,
      enumerable: false,
    });
    rejects(invisible);
  });

  it('accepts null-prototype plain records without importing inherited state', () => {
    const input = Object.assign(
      Object.create(null) as Record<string, unknown>,
      fixture(),
    );
    expect(encodeAdmissionSeal(input).projection.codecVersion).toBe(1);
  });

  it('rejects sparse arrays, array accessors, extra properties and an oversized fact cohort', () => {
    const input = fixture();
    input.inputs.ACHIEVEMENTS.command.facts.length = 2;
    rejects(input);
    const accessor = fixture();
    const getter = jest.fn();
    Object.defineProperty(accessor.inputs.ACHIEVEMENTS.command.facts, '0', {
      enumerable: true,
      get: getter,
    });
    rejects(accessor);
    expect(getter).not.toHaveBeenCalled();
    const extra = fixture();
    Object.assign(extra.inputs.ACHIEVEMENTS.command.facts, { secret: true });
    rejects(extra);
    const many = fixture();
    many.inputs.ACHIEVEMENTS.command.facts = Array.from(
      { length: 4 },
      () => many.inputs.ACHIEVEMENTS.command.facts[0],
    );
    rejects(many);
  });

  it.each(['\ud800', '\udfff'])(
    'rejects an unpaired surrogate without replacement: %p',
    (text) => {
      const input = fixture();
      input.canonical.sourceId = text;
      input.inputs.ACHIEVEMENTS.command.event.sourceId = text;
      rejects(input);
    },
  );

  it('measures opaque strings in UTF-8 bytes and preserves Unicode normalization', () => {
    const input = fixture();
    const text = 'é'.repeat(8192);
    input.canonical.sourceId = text;
    input.inputs.ACHIEVEMENTS.command.event.sourceId = text;
    expect(encodeAdmissionSeal(input).projection.canonical.sourceId).toBe(text);
    input.canonical.sourceId += 'é';
    input.inputs.ACHIEVEMENTS.command.event.sourceId += 'é';
    rejects(input, 'PROJECTION_TOO_LARGE');
    const decomposed = fixture();
    decomposed.canonical.sourceId = 'e\u0301';
    decomposed.inputs.ACHIEVEMENTS.command.event.sourceId = 'e\u0301';
    const composed = fixture();
    composed.canonical.sourceId = 'é';
    composed.inputs.ACHIEVEMENTS.command.event.sourceId = 'é';
    expect(encodeAdmissionSeal(decomposed).digest).not.toEqual(
      encodeAdmissionSeal(composed).digest,
    );
  });

  it.each([NaN, Infinity, 0, 1.5])(
    'rejects a non-canonical signed value: %p',
    (value) => {
      const input = fixture();
      input.inputs.ACHIEVEMENTS.command.event.payload.value = value;
      rejects(input);
    },
  );

  it('does not coerce versions, unknown tags, IDs or timestamps', () => {
    rejects({ ...fixture(), codecVersion: '1' });
    const wrong = fixture();
    wrong.inputs.ACHIEVEMENTS.codec = 'unknown';
    rejects(wrong);
    const id = fixture();
    id.canonical.eventId = 'not-a-uuid';
    rejects(id);
    const date = fixture();
    date.canonical.occurredAt = 'not-a-date';
    rejects(date);
  });

  it('rejects mismatched canonical/owned identities and unsupported applicability', () => {
    const input = fixture();
    input.inputs.ACHIEVEMENTS.command.event.sourceId = 'another-source';
    rejects(input);
    const applicability = fixture();
    applicability.applicability.POINTS = true;
    rejects(applicability);
  });

  it('retains reviewed mapping fields and bounds the existing owner mapping cohort', () => {
    const input = fixture();
    const mapping: VerifiedAchievementMapping = {
      awardId: 'opaque-award',
      qualification: { producer: 'dss.api.reputation', factId },
      evidenceId: 'reviewed-manifest',
      evidenceDigest: 'a'.repeat(64),
    };
    input.inputs.ACHIEVEMENTS.command.mappings = [mapping];
    expect(
      encodeAdmissionSeal(input).projection.inputs.ACHIEVEMENTS.command
        .mappings,
    ).toEqual([mapping]);
    input.inputs.ACHIEVEMENTS.command.mappings = Array.from(
      { length: 65 },
      () => mapping,
    );
    rejects(input);
  });

  it('allows exactly 256KiB canonical bytes and rejects the next byte', () => {
    const input = fixture();
    input.inputs.ACHIEVEMENTS.command.mappings = Array.from(
      { length: 15 },
      () => ({
        awardId: 'a'.repeat(16384),
        qualification: { producer: 'dss.api.reputation', factId },
        evidenceId: 'e',
        evidenceDigest: 'b'.repeat(64),
      }),
    );
    const base = encodeAdmissionSeal(input).encodedBytes;
    const padding = 262144 - base;
    expect(padding).toBeGreaterThan(0);
    expect(padding + 1).toBeLessThanOrEqual(16384);
    input.inputs.ACHIEVEMENTS.command.mappings[0].evidenceId = 'e'.repeat(
      padding + 1,
    );
    expect(encodeAdmissionSeal(input).encodedBytes).toBe(262144);
    input.inputs.ACHIEVEMENTS.command.mappings[0].evidenceId += 'e';
    rejects(input, 'PROJECTION_TOO_LARGE');
  });

  it('detects projection, digest, and byte-length tampering after storage', () => {
    const input = fixture();
    const encoded = encodeAdmissionSeal(input);
    input.inputs.ACHIEVEMENTS.command.event.payload.recipientId = 'changed';
    expect(() =>
      verifyAdmissionSeal(input, encoded.digest, encoded.encodedBytes),
    ).toThrow(AdmissionCodecError);
    const digest = Buffer.from(encoded.digest);
    digest[0] ^= 1;
    expect(() =>
      verifyAdmissionSeal(encoded.projection, digest, encoded.encodedBytes),
    ).toThrow(AdmissionCodecError);
    expect(() =>
      verifyAdmissionSeal(
        encoded.projection,
        encoded.digest,
        encoded.encodedBytes + 1,
      ),
    ).toThrow(AdmissionCodecError);
    expect(() =>
      verifyAdmissionSeal(
        encoded.projection,
        new Uint8Array(0),
        encoded.encodedBytes,
      ),
    ).toThrow(AdmissionCodecError);
  });
});
