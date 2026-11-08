/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements Qualification Storage Tests
 * 📄 File: apps/api/test/achievement-qualification-storage.e2e-spec.ts
 * 🎯 Purpose: Proves additive provenance constraints in a real migrated schema.
 * 🧠 Responsibilities: Exercises immutable facts/bindings and monotonic cursor guards.
 * 🏗️ Architecture: Isolated database fixture; no automatic dispatch or producer attestation.
 * ⚠️ Important: Storage proofs do not establish qualified-command ordering or activation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Achievement qualification storage (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
  }, 60000);
  afterAll(async () => {
    await fixture?.close();
  });

  async function source() {
    const id = randomUUID();
    const cursor = await fixture.prisma.achievementSourceCursor.create({
      data: {
        producer: `synthetic.${id}`,
        sourceKind: 'Synthetic',
        sourceId: id,
      },
    });
    const factId = randomUUID();
    const eventId = randomUUID();
    const fact = await fixture.prisma.achievementSourceFact.create({
      data: {
        cursorId: cursor.id,
        producer: cursor.producer,
        producerFactId: factId,
        canonicalEventId: eventId,
        revision: 1n,
        action: 'QUALIFY',
        qualificationId: randomUUID(),
        qualificationRevision: 1n,
        qualificationEventId: eventId,
        qualificationFactId: factId,
        retiredThroughRevision: 0n,
        factDigest: '0'.repeat(64),
      },
    });
    return { cursor, fact };
  }

  async function award(
    sourceEventId: string,
    kind: 'RULE' | 'MANUAL' = 'RULE',
  ) {
    const userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: `${userId}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key: userId,
        name: 'Synthetic qualification',
        slug: userId,
        color: '#112233',
        badge: 'synthetic',
        createdById: userId,
        updatedById: userId,
      },
    });
    const eventName = 'synthetic.qualification.created.v1';
    const rule =
      kind === 'RULE'
        ? await fixture.prisma.achievementRule.create({
            data: {
              achievementId: definition.id,
              eventName,
              createdById: userId,
              updatedById: userId,
            },
          })
        : null;
    return fixture.prisma.achievementAward.create({
      data: {
        userId,
        achievementId: definition.id,
        kind,
        reason: 'Synthetic storage proof',
        sourceEventId,
        ...(rule
          ? { ruleId: rule.id, sourceEventName: eventName }
          : { awardedById: userId }),
      },
    });
  }

  it('starts with unready empty progress and requires a fact for a higher target', async () => {
    const { cursor } = await source();
    expect(cursor).toMatchObject({
      appliedRevision: 0n,
      targetRevision: 0n,
      phase: 'RETIRING',
      enrollmentState: 'PENDING',
    });
    await expect(
      fixture.prisma.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: { targetRevision: 2n, generation: 1n },
      }),
    ).rejects.toThrow('Achievement target requires its immutable fact');
    expect(
      (
        await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
          where: { id: cursor.id },
        })
      ).targetRevision,
    ).toBe(0n);
  });

  it('preserves fact history and refuses conflicting revision reuse', async () => {
    const { cursor, fact } = await source();
    await expect(
      fixture.prisma.achievementSourceFact.update({
        where: { id: fact.id },
        data: { qualificationId: randomUUID() },
      }),
    ).rejects.toThrow('Achievement qualification history is immutable');
    await expect(
      fixture.prisma.achievementSourceFact.delete({ where: { id: fact.id } }),
    ).rejects.toThrow('Achievement qualification history is immutable');
    const otherFactId = randomUUID();
    await expect(
      fixture.prisma.achievementSourceFact.create({
        data: {
          ...fact,
          eventProjection: fact.eventProjection ?? Prisma.DbNull,
          id: randomUUID(),
          producerFactId: otherFactId,
          qualificationFactId: otherFactId,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      await fixture.prisma.achievementSourceFact.count({
        where: { cursorId: cursor.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementSourceFact.findUnique({
        where: { id: fact.id },
      }),
    ).toEqual(fact);
  });

  it('requires a generation for a new target and refuses progress reversal', async () => {
    const { cursor } = await source();
    await expect(
      fixture.prisma.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: { targetRevision: 1n },
      }),
    ).rejects.toThrow('Achievement source target needs a new generation');
    const stable = await fixture.prisma.achievementSourceCursor.update({
      where: { id: cursor.id },
      data: {
        targetRevision: 1n,
        appliedRevision: 1n,
        generation: 1n,
        enrollmentState: 'READY',
        phase: 'STABLE',
        progress: 1n,
      },
    });
    await expect(
      fixture.prisma.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: { progress: 0n },
      }),
    ).rejects.toThrow('Achievement source progress cannot decrease');
    await expect(
      fixture.prisma.achievementSourceCursor.delete({
        where: { id: cursor.id },
      }),
    ).rejects.toThrow('Achievement source history cannot be deleted');
    expect(
      await fixture.prisma.achievementSourceCursor.findUnique({
        where: { id: cursor.id },
      }),
    ).toEqual(stable);
  });

  it('binds only the matching RULE event and keeps binding history immutable', async () => {
    const { cursor, fact } = await source();
    const grant = await award(fact.canonicalEventId);
    const binding = await fixture.prisma.achievementAwardQualification.create({
      data: {
        awardId: grant.id,
        cursorId: cursor.id,
        factId: fact.id,
        qualificationRevision: 1n,
        sourceEventId: fact.canonicalEventId,
      },
    });
    await expect(
      fixture.prisma.achievementAwardQualification.update({
        where: { awardId: grant.id },
        data: { mappingEvidenceId: 'changed' },
      }),
    ).rejects.toThrow('Achievement qualification history is immutable');
    await expect(
      fixture.prisma.achievementAwardQualification.delete({
        where: { awardId: grant.id },
      }),
    ).rejects.toThrow('Achievement qualification history is immutable');
    expect(
      await fixture.prisma.achievementAwardQualification.findUnique({
        where: { awardId: grant.id },
      }),
    ).toEqual(binding);
  });

  it('requires existing applied facts and a new generation to reset inventory', async () => {
    const { cursor } = await source();
    await expect(
      fixture.prisma.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: { appliedRevision: 2n, targetRevision: 2n, generation: 1n },
      }),
    ).rejects.toThrow('Achievement target requires its immutable fact');
    await fixture.prisma.achievementSourceCursor.update({
      where: { id: cursor.id },
      data: { inventoryAfterId: 'synthetic-frontier' },
    });
    await expect(
      fixture.prisma.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: { inventoryAfterId: null },
      }),
    ).rejects.toThrow('Achievement inventory reset needs a new generation');
    expect(
      await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
        where: { id: cursor.id },
      }),
    ).toMatchObject({
      inventoryAfterId: 'synthetic-frontier',
      generation: 0n,
      appliedRevision: 0n,
    });
  });

  it('rejects manual grants and mismatched events without creating bindings', async () => {
    for (const kind of ['RULE', 'MANUAL'] as const) {
      const { cursor, fact } = await source();
      const grant = await award(
        kind === 'RULE' ? randomUUID() : fact.canonicalEventId,
        kind,
      );
      await expect(
        fixture.prisma.achievementAwardQualification.create({
          data: {
            awardId: grant.id,
            cursorId: cursor.id,
            factId: fact.id,
            qualificationRevision: 1n,
            sourceEventId: fact.canonicalEventId,
          },
        }),
      ).rejects.toThrow(
        'Achievement binding must match its rule award and qualifying event',
      );
      expect(
        await fixture.prisma.achievementAwardQualification.findUnique({
          where: { awardId: grant.id },
        }),
      ).toBeNull();
    }
  });
});
