/** DSS Universe — qualified Points on migrated disposable PostgreSQL.
 * Tests the owner, not canonical root attestation, login or queue delivery.
 * Synthetic producer facts are explicitly supplied through the inactive port.
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { PrismaProfileExistenceReader } from '../src/modules/users/infrastructure/repositories/prisma-profile-existence.reader';
import type {
  QualifiedPointCommand,
  QualifiedPointFact,
} from '@api/modules/community-points';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { QualifiedPointsService } from '../src/modules/community-points/application/services/qualified-points.service';
import { PrismaCommunityPointsRepository } from '../src/modules/community-points/infrastructure/repositories/prisma-community-points.repository';
import { PrismaQualifiedPointsRepository } from '../src/modules/community-points/infrastructure/repositories/prisma-qualified-points.repository';
import { pointFactData } from '../src/modules/community-points/infrastructure/repositories/qualified-point-data';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Qualified Points facets and source cycles (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let controls: Pool,
    ledger: PrismaCommunityPointsRepository,
    legacy: CommunityPointsService,
    service: QualifiedPointsService;
  let userId: string, eventName: string, ruleKey: string;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    controls = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    ledger = new PrismaCommunityPointsRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
    );
    const existence = new PrismaProfileExistenceReader(fixture.prisma);
    legacy = new CommunityPointsService(ledger, existence);
    service = new QualifiedPointsService(
      new PrismaQualifiedPointsRepository(fixture.prisma, ledger),
      existence,
    );
  }, 60000);
  beforeEach(async () => {
    userId = randomUUID();
    ruleKey = `qualified.${randomUUID()}`;
    eventName = `${ruleKey}.v1`;
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: `${userId}@dss.test`,
        passwordHash: 'synthetic-not-login-evidence',
      },
    });
    await fixture.prisma.communityPointRule.create({
      data: { key: ruleKey, eventName, points: 10, dailyLimit: null },
    });
  });
  afterAll(async () => {
    try {
      await controls?.end();
    } finally {
      await fixture?.close();
    }
  });

  function qualify(
    sourceId: string = randomUUID(),
    revision = '1',
    retired = '0',
    prior: QualifiedPointFact | null = null,
  ): QualifiedPointCommand {
    const event = {
      eventId: randomUUID(),
      eventName,
      eventVersion: 1,
      producer: 'audit.qualified-points',
      sourceType: 'SyntheticDocument',
      sourceId,
      actorId: userId,
      occurredAt: `2026-11-16T08:00:${revision.padStart(2, '0')}.000Z`,
      value: null,
    };
    const factId = randomUUID();
    const fact: QualifiedPointFact = {
      producer: event.producer,
      sourceKind: event.sourceType,
      sourceId,
      factId,
      canonicalEventId: event.eventId,
      revision,
      action: 'QUALIFY',
      qualificationId: factId,
      qualificationRevision: revision,
      qualificationEventId: event.eventId,
      qualificationFactId: factId,
      retiredThroughRevision: retired,
      predecessorWithdrawalFactId: prior?.factId ?? null,
      contractVersion: 1,
      qualification: {
        recipientId: userId,
        eventName,
        eventVersion: 1,
        sourceType: event.sourceType,
        sourceId,
        actorId: userId,
        occurredAt: event.occurredAt,
        value: null,
      },
    };
    return {
      contractVersion: 1,
      event,
      recipientId: userId,
      facts: [fact],
      contribution: { producer: event.producer, factId },
      facets: ['CONTROL', 'CONTRIBUTION'],
    };
  }
  function withdraw(
    original: QualifiedPointCommand,
    contribution = false,
  ): QualifiedPointCommand {
    const q = original.facts.find(
      (f) => f.factId === original.contribution!.factId,
    )!;
    const event = {
      ...original.event,
      eventId: randomUUID(),
      eventName: `withdraw.${randomUUID()}.v1`,
      occurredAt: '2026-11-16T08:00:02.000Z',
    };
    const w: QualifiedPointFact = {
      ...q,
      factId: randomUUID(),
      canonicalEventId: event.eventId,
      revision: (BigInt(q.revision) + 1n).toString(),
      action: 'WITHDRAW',
      retiredThroughRevision: q.qualificationRevision,
      predecessorWithdrawalFactId: null,
    };
    const facts = [q, w];
    let ref: QualifiedPointCommand['contribution'] = null;
    if (contribution) {
      const factId = randomUUID();
      const e: QualifiedPointFact = {
        ...q,
        sourceKind: '@event',
        sourceId: event.eventId,
        factId,
        canonicalEventId: event.eventId,
        revision: '1',
        action: 'QUALIFY',
        qualificationId: factId,
        qualificationRevision: '1',
        qualificationEventId: event.eventId,
        qualificationFactId: factId,
        retiredThroughRevision: '0',
        predecessorWithdrawalFactId: null,
        qualification: {
          ...q.qualification,
          eventName: event.eventName,
          occurredAt: event.occurredAt,
        },
      };
      facts.push(e);
      ref = { producer: e.producer, factId: e.factId };
    }
    return {
      contractVersion: 1,
      event,
      recipientId: userId,
      facts,
      contribution: ref,
      facets: contribution ? ['CONTROL', 'CONTRIBUTION'] : ['CONTROL'],
    };
  }
  function successor(
    original: QualifiedPointCommand,
    w: QualifiedPointCommand,
  ) {
    const withdrawal = w.facts.find((f) => f.action === 'WITHDRAW')!;
    const next = qualify(original.event.sourceId!, '3', '1', withdrawal);
    return { ...next, facts: [original.facts[0], withdrawal, next.facts[0]] };
  }
  async function oldConsume(command: QualifiedPointCommand) {
    return legacy.consume({
      eventId: command.event.eventId,
      eventName: command.event.eventName,
      eventVersion: 1,
      producer: command.event.producer,
      category: 'integration',
      actorId: command.event.actorId ?? undefined,
      aggregateType: command.event.sourceType ?? undefined,
      aggregateId: command.event.sourceId ?? undefined,
      occurredAt: command.event.occurredAt,
      payload: { userId: command.recipientId },
    });
  }
  const complete = (facets: unknown[]) => ({ status: 'COMPLETE', facets });
  const facet = (
    name: 'CONTROL' | 'CONTRIBUTION',
    disposition: string,
    replayed = false,
  ) => ({ facet: name, disposition, replayed });

  async function blockedBy(pid: number) {
    const deadline = performance.now() + 2000;
    do {
      const { rows } = await controls.query<{ pid: number }>(
        "SELECT pid FROM pg_stat_activity WHERE state='active' AND $1::int=ANY(pg_blocking_pids(pid))",
        [pid],
      );
      if (rows[0]) return rows[0].pid;
    } while (performance.now() < deadline);
    throw new Error('Expected physical qualified Points lock contention');
  }
  async function holdInsert(
    table: 'community_point_entries' | 'community_point_source_facts',
    column: 'sourceEventId' | 'factId' | 'reversesEntryId',
    id: string,
  ) {
    if (
      !/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema) ||
      !/^[a-f0-9-]{36}$/.test(id)
    )
      throw new Error('Unsafe fixture identifiers');
    const coordinate = `qualified-points-test:${randomUUID()}`;
    await controls.query(
      `CREATE FUNCTION "${fixture.schema}".hold_qualified_insert() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN IF NEW."${column}" = '${id}' THEN PERFORM pg_advisory_xact_lock(hashtextextended('${coordinate}',0)); END IF; RETURN NEW; END $body$`,
    );
    await controls.query(
      `CREATE TRIGGER hold_qualified_insert BEFORE INSERT ON "${fixture.schema}"."${table}" FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".hold_qualified_insert()`,
    );
    const holder = await controls.connect();
    await holder.query('BEGIN');
    await holder.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      coordinate,
    ]);
    const {
      rows: [owner],
    } = await holder.query<{ pid: number }>(
      'SELECT pg_backend_pid()::int AS pid',
    );
    let released = false;
    const release = async () => {
      if (!released) {
        await holder.query('ROLLBACK');
        released = true;
      }
    };
    return {
      pid: owner.pid,
      release,
      close: async () => {
        try {
          await release();
        } finally {
          holder.release();
        }
        await controls.query(
          `DROP TRIGGER hold_qualified_insert ON "${fixture.schema}"."${table}"`,
        );
        await controls.query(
          `DROP FUNCTION "${fixture.schema}".hold_qualified_insert()`,
        );
      },
    };
  }

  it('commits both facets, replays exact original results and preserves immutable history', async () => {
    const q = qualify();
    expect(await service.advance(q)).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT'),
        facet('CONTRIBUTION', 'APPLIED'),
      ]),
    );
    expect(
      await service.advance({ ...q, facets: [...q.facets].reverse() }),
    ).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT', true),
        facet('CONTRIBUTION', 'APPLIED', true),
      ]),
    );
    expect(await ledger.balance(userId)).toBe(10);
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(1);
    expect(
      await fixture.prisma.communityPointFacetReceipt.count({
        where: { eventId: q.event.eventId },
      }),
    ).toBe(2);
    for (const table of [
      'community_point_facet_receipts',
      'community_point_source_facts',
      'community_point_qualifications',
    ] as const) {
      await expect(
        controls.query(`DELETE FROM "${fixture.schema}"."${table}"`),
      ).rejects.toThrow('immutable');
    }
  });
  it('retires a missing award before late delivery and permits a legitimate new cycle', async () => {
    const q = qualify(),
      w = withdraw(q),
      next = successor(q, w);
    expect(await service.advance(w)).toEqual(
      complete([facet('CONTROL', 'NO_SOURCE_EFFECT')]),
    );
    expect(await service.advance(q)).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT'),
        facet('CONTRIBUTION', 'SOURCE_REVOKED'),
      ]),
    );
    expect(await ledger.balance(userId)).toBe(0);
    expect((await service.advance(next)).status).toBe('COMPLETE');
    expect(await ledger.balance(userId)).toBe(10);
    expect(await service.advance(q)).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT', true),
        facet('CONTRIBUTION', 'SOURCE_REVOKED', true),
      ]),
    );
    expect(await service.advance(w)).toEqual(
      complete([facet('CONTROL', 'NO_SOURCE_EFFECT', true)]),
    );
    expect(await ledger.balance(userId)).toBe(10);
  });
  it('reconciles predecessor withdrawal before a successor contribution, without retracting the successor later', async () => {
    const q = qualify(),
      w = withdraw(q),
      next = successor(q, w);
    expect((await service.advance(q)).status).toBe('COMPLETE');
    expect(await service.advance(next)).toEqual(
      complete([facet('CONTROL', 'APPLIED'), facet('CONTRIBUTION', 'APPLIED')]),
    );
    expect(await service.advance(w)).toEqual(
      complete([facet('CONTROL', 'NO_SOURCE_EFFECT')]),
    );
    expect(await ledger.balance(userId)).toBe(10);
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(3);
    const reversals = await fixture.prisma.communityPointEntry.findMany({
      where: { userId, reversesEntryId: { not: null } },
    });
    expect(reversals).toHaveLength(1);
    expect(reversals[0].actorId).toBeNull();
  });
  it('does not drop a configured contribution on an event that also withdraws an original', async () => {
    const q = qualify(),
      w = withdraw(q, true);
    await fixture.prisma.communityPointRule.create({
      data: {
        key: `control.${randomUUID()}`,
        eventName: w.event.eventName,
        points: 3,
      },
    });
    expect((await service.advance(q)).status).toBe('COMPLETE');
    expect(await service.advance(w)).toEqual(
      complete([facet('CONTROL', 'APPLIED'), facet('CONTRIBUTION', 'APPLIED')]),
    );
    expect(await ledger.balance(userId)).toBe(3);
    expect(await service.advance(w)).toEqual(
      complete([
        facet('CONTROL', 'APPLIED', true),
        facet('CONTRIBUTION', 'APPLIED', true),
      ]),
    );
    expect(await ledger.balance(userId)).toBe(3);
  });
  it('retains NO_MATCH after rule enablement without inventing economic effects', async () => {
    const q = qualify();
    q.event.eventName = `unmatched.${randomUUID()}`;
    q.facts[0].qualification.eventName = q.event.eventName;
    expect(await service.advance(q)).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT'),
        facet('CONTRIBUTION', 'NO_MATCH'),
      ]),
    );
    await fixture.prisma.communityPointRule.create({
      data: {
        key: `later.${randomUUID()}`,
        eventName: q.event.eventName,
        points: 100,
      },
    });
    expect(await service.advance(q)).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT', true),
        facet('CONTRIBUTION', 'NO_MATCH', true),
      ]),
    );
    expect(await ledger.balance(userId)).toBe(0);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: {
          eventName: 'community-points.awarded.v1',
          payload: { path: ['userId'], equals: userId },
        },
      }),
    ).toBe(0);
  });
  it('serializes distinct-event daily caps and retains CAPPED after numerical edits', async () => {
    await fixture.prisma.communityPointRule.update({
      where: { key: ruleKey },
      data: { dailyLimit: 1 },
    });
    const commands = [qualify(), qualify()];
    const outcomes = await Promise.all(commands.map((c) => service.advance(c)));
    expect(
      outcomes
        .map((o) =>
          o.status === 'COMPLETE' ? o.facets[1].disposition : o.status,
        )
        .sort(),
    ).toEqual(['APPLIED', 'CAPPED']);
    expect(await ledger.balance(userId)).toBe(10);
    await legacy.updateRule(ruleKey, 100, null, true, userId);
    const replay = await Promise.all(commands.map((c) => service.advance(c)));
    expect(
      replay
        .map((o) =>
          o.status === 'COMPLETE' ? o.facets[1].disposition : o.status,
        )
        .sort(),
    ).toEqual(['APPLIED', 'CAPPED']);
    expect(await ledger.balance(userId)).toBe(10);
  });
  it('adopts exact legacy contribution evidence without another award or history rewrite', async () => {
    const q = qualify();
    expect((await oldConsume(q)).status).toBe('AWARDED');
    const rows = await fixture.prisma.communityPointEntry.findMany({
      where: { userId },
    });
    expect(await service.advance(q)).toEqual(
      complete([
        facet('CONTROL', 'NO_SOURCE_EFFECT'),
        facet('CONTRIBUTION', 'APPLIED'),
      ]),
    );
    expect(
      await fixture.prisma.communityPointEntry.findMany({ where: { userId } }),
    ).toEqual(rows);
    expect(
      await fixture.prisma.communityPointQualification.findMany({
        where: { entryId: rows[0].id },
      }),
    ).toHaveLength(1);
  });
  it('does not interpret a ledger-less legacy marker as a known facet disposition', async () => {
    await fixture.prisma.communityPointRule.update({
      where: { key: ruleKey },
      data: { dailyLimit: 1 },
    });
    expect((await oldConsume(qualify())).status).toBe('AWARDED');
    const q = qualify();
    expect((await oldConsume(q)).status).toBe('CAPPED');
    expect(await service.advance(q)).toEqual({
      status: 'BLOCKED',
      code: 'LEGACY_EVIDENCE_REQUIRED',
    });
    expect(
      await fixture.prisma.communityPointFacetReceipt.findUnique({
        where: {
          eventId_facet: { eventId: q.event.eventId, facet: 'CONTRIBUTION' },
        },
      }),
    ).toBeNull();
    expect(await ledger.balance(userId)).toBe(10);
  });
  it('accepts a new verified cycle despite an exact legacy permanent source revocation', async () => {
    const q = qualify(),
      w = withdraw(q),
      next = successor(q, w);
    expect((await oldConsume(q)).status).toBe('AWARDED');
    await ledger.reverseSource(
      q.event.sourceType!,
      q.event.sourceId!,
      w.event.eventId,
      userId,
      'Synthetic legacy source withdrawal.',
      new Date(w.event.occurredAt),
    );
    const oldRows = await fixture.prisma.communityPointEntry.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
    expect((await service.advance(next)).status).toBe('COMPLETE');
    expect(await ledger.balance(userId)).toBe(10);
    expect(
      await fixture.prisma.communityPointEntry.findMany({
        where: { id: { in: oldRows.map((r) => r.id) } },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(oldRows);
    expect(
      await fixture.prisma.communityPointRevokedSource.count({
        where: { sourceType: q.event.sourceType!, sourceId: q.event.sourceId! },
      }),
    ).toBe(1);
  });

  for (const first of ['award', 'withdrawal'] as const) {
    it(`fences ${first}-first delivery physically while another source remains independent`, async () => {
      const q = qualify(),
        w = withdraw(q);
      const barrier = await holdInsert(
        first === 'award'
          ? 'community_point_entries'
          : 'community_point_source_facts',
        first === 'award' ? 'sourceEventId' : 'factId',
        first === 'award'
          ? q.event.eventId
          : w.facts.find((f) => f.action === 'WITHDRAW')!.factId,
      );
      const pending: Promise<unknown>[] = [];
      try {
        const one = service.advance(first === 'award' ? q : w);
        pending.push(one);
        void one.catch(() => undefined);
        const winner = await blockedBy(barrier.pid);
        expect((await service.advance(qualify())).status).toBe('COMPLETE');
        expect(await ledger.balance(userId)).toBe(10);
        const two = service.advance(first === 'award' ? w : q);
        pending.push(two);
        void two.catch(() => undefined);
        await blockedBy(winner);
        await barrier.release();
        expect((await Promise.all([one, two])).map((o) => o.status)).toEqual([
          'COMPLETE',
          'COMPLETE',
        ]);
        expect(await ledger.balance(userId)).toBe(10);
        expect(
          await fixture.prisma.communityPointEntry.count({ where: { userId } }),
        ).toBe(first === 'award' ? 3 : 1);
      } finally {
        await barrier.release();
        await Promise.allSettled(pending);
        await barrier.close();
      }
    });
  }
  for (const first of ['manual', 'qualified'] as const) {
    it(`preserves one reversal with ${first}-first manual/source competition`, async () => {
      const q = qualify(),
        w = withdraw(q);
      expect((await service.advance(q)).status).toBe('COMPLETE');
      const original =
        await fixture.prisma.communityPointEntry.findUniqueOrThrow({
          where: { sourceEventId: q.event.eventId },
        });
      const barrier = await holdInsert(
        'community_point_entries',
        'reversesEntryId',
        original.id,
      );
      const pending: Promise<unknown>[] = [];
      const manual = () =>
        ledger.reverse(
          original.id,
          userId,
          'Synthetic manual reversal.',
          new Date(w.event.occurredAt),
        );
      const source = () => service.advance(w);
      try {
        const one = first === 'manual' ? manual() : source();
        pending.push(one);
        void one.catch(() => undefined);
        const winner = await blockedBy(barrier.pid);
        const two = first === 'manual' ? source() : manual();
        pending.push(two);
        void two.catch(() => undefined);
        await blockedBy(winner);
        await barrier.release();
        const settled = await Promise.allSettled([one, two]);
        expect(settled.map((r) => r.status)).toEqual([
          'fulfilled',
          'fulfilled',
        ]);
        expect(await ledger.balance(userId)).toBe(0);
        expect(
          await fixture.prisma.communityPointEntry.count({
            where: { reversesEntryId: original.id },
          }),
        ).toBe(1);
      } finally {
        await barrier.release();
        await Promise.allSettled(pending);
        await barrier.close();
      }
    });
  }

  it('fences same-event replay while the original contribution is in flight', async () => {
    const q = qualify(),
      barrier = await holdInsert(
        'community_point_entries',
        'sourceEventId',
        q.event.eventId,
      );
    const pending: Promise<unknown>[] = [];
    try {
      const first = service.advance(q);
      pending.push(first);
      void first.catch(() => undefined);
      const winner = await blockedBy(barrier.pid);
      const duplicate = service.advance(q);
      pending.push(duplicate);
      void duplicate.catch(() => undefined);
      await blockedBy(winner);
      await barrier.release();
      expect((await first).status).toBe('COMPLETE');
      expect(await duplicate).toEqual(
        complete([
          facet('CONTROL', 'NO_SOURCE_EFFECT', true),
          facet('CONTRIBUTION', 'APPLIED', true),
        ]),
      );
      expect(await ledger.balance(userId)).toBe(10);
      expect(
        await fixture.prisma.communityPointEntry.count({ where: { userId } }),
      ).toBe(1);
    } finally {
      await barrier.release();
      await Promise.allSettled(pending);
      await barrier.close();
    }
  });

  it('recovers a failed contribution after control has already compensated an actual award', async () => {
    const q = qualify(),
      w = withdraw(q, true);
    await fixture.prisma.communityPointRule.create({
      data: {
        key: `reversal.${randomUUID()}`,
        eventName: w.event.eventName,
        points: 3,
      },
    });
    expect((await service.advance(q)).status).toBe('COMPLETE');
    await controls.query(
      `CREATE FUNCTION "${fixture.schema}".fail_after_control() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN IF NEW."facet" = 'CONTRIBUTION' THEN RAISE EXCEPTION 'synthetic failure after control'; END IF; RETURN NEW; END $body$`,
    );
    await controls.query(
      `CREATE TRIGGER fail_after_control BEFORE INSERT ON "${fixture.schema}"."community_point_facet_receipts" FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".fail_after_control()`,
    );
    try {
      await expect(service.advance(w)).rejects.toBeDefined();
      expect(await ledger.balance(userId)).toBe(0);
      expect(
        await fixture.prisma.communityPointFacetReceipt.findUnique({
          where: {
            eventId_facet: { eventId: w.event.eventId, facet: 'CONTROL' },
          },
        }),
      ).toMatchObject({ disposition: 'APPLIED' });
      expect(
        await fixture.prisma.communityPointEntry.count({ where: { userId } }),
      ).toBe(2);
    } finally {
      await controls.query(
        `DROP TRIGGER fail_after_control ON "${fixture.schema}"."community_point_facet_receipts"`,
      );
      await controls.query(
        `DROP FUNCTION "${fixture.schema}".fail_after_control()`,
      );
    }
    expect(await service.advance(w)).toEqual(
      complete([
        facet('CONTROL', 'APPLIED', true),
        facet('CONTRIBUTION', 'APPLIED'),
      ]),
    );
    expect(await ledger.balance(userId)).toBe(3);
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(3);
  });

  it('keeps work bounded with one thousand unrelated source facts', async () => {
    expect((await service.advance(qualify())).status).toBe('COMPLETE');
    let start = fixture.queries.length;
    expect((await service.advance(qualify())).status).toBe('COMPLETE');
    const before = fixture.queries.length - start;
    const noise = Array.from({ length: 1000 }, () => {
      const command = qualify();
      return {
        cursor: {
          id: randomUUID(),
          producer: command.event.producer,
          sourceKind: command.facts[0].sourceKind,
          sourceId: command.facts[0].sourceId,
        },
        fact: command.facts[0],
      };
    });
    await fixture.prisma.communityPointSourceCursor.createMany({
      data: noise.map((row) => row.cursor),
    });
    await fixture.prisma.communityPointSourceFact.createMany({
      data: noise.map((row) => pointFactData(row.fact, row.cursor.id)),
    });
    start = fixture.queries.length;
    expect((await service.advance(qualify())).status).toBe('COMPLETE');
    const after = fixture.queries.length - start;
    expect(after).toBe(before);
    expect(after).toBeLessThan(100);
    expect(await ledger.balance(userId)).toBe(30);
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(3);
  });

  it('blocks conflicting command reuse without editing its original receipt', async () => {
    const q = qualify();
    expect((await service.advance(q)).status).toBe('COMPLETE');
    const original = await fixture.prisma.communityPointFacetReceipt.findMany({
      where: { eventId: q.event.eventId },
      orderBy: { facet: 'asc' },
    });
    const changed = JSON.parse(JSON.stringify(q)) as QualifiedPointCommand;
    changed.event.value = 1;
    changed.facts[0].qualification.value = 1;
    expect(await service.advance(changed)).toEqual({
      status: 'BLOCKED',
      code: 'FACT_CONFLICT',
    });
    expect(
      await fixture.prisma.communityPointFacetReceipt.findMany({
        where: { eventId: q.event.eventId },
        orderBy: { facet: 'asc' },
      }),
    ).toEqual(original);
    expect(await ledger.balance(userId)).toBe(10);
  });

  it('blocks one producer fact identity reused for a different source', async () => {
    const q = qualify();
    expect((await service.advance(q)).status).toBe('COMPLETE');
    const other = qualify();
    other.facts[0].factId = q.facts[0].factId;
    other.facts[0].qualificationId = q.facts[0].qualificationId;
    other.facts[0].qualificationFactId = q.facts[0].factId;
    other.contribution!.factId = q.facts[0].factId;
    expect(await service.advance(other)).toEqual({
      status: 'BLOCKED',
      code: 'FACT_CONFLICT',
    });
    expect(await ledger.balance(userId)).toBe(10);
    expect(
      await fixture.prisma.communityPointSourceCursor.findUnique({
        where: {
          producer_sourceKind_sourceId: {
            producer: other.event.producer,
            sourceKind: other.event.sourceType!,
            sourceId: other.event.sourceId!,
          },
        },
      }),
    ).toBeNull();
  });

  it('keeps identical source/fact identifiers isolated by producer namespace', async () => {
    const first = qualify(),
      second = qualify(first.event.sourceId!);
    second.event.producer = 'audit.other-producer';
    second.facts[0].producer = second.event.producer;
    second.facts[0].factId = first.facts[0].factId;
    second.facts[0].qualificationId = first.facts[0].qualificationId;
    second.facts[0].qualificationFactId = first.facts[0].factId;
    second.contribution = {
      producer: second.event.producer,
      factId: second.facts[0].factId,
    };
    expect((await service.advance(first)).status).toBe('COMPLETE');
    expect((await service.advance(second)).status).toBe('COMPLETE');
    expect(await ledger.balance(userId)).toBe(20);
    expect((await service.advance(withdraw(first))).status).toBe('COMPLETE');
    expect(await ledger.balance(userId)).toBe(10);
  });

  it('rejects missing legacy control proof instead of guessing its lifecycle', async () => {
    const q = qualify();
    await ledger.reverseSource(
      q.event.sourceType!,
      q.event.sourceId!,
      randomUUID(),
      userId,
      'Unbound synthetic legacy withdrawal.',
      new Date(q.event.occurredAt),
    );
    expect(await service.advance(q)).toEqual({
      status: 'BLOCKED',
      code: 'LEGACY_EVIDENCE_REQUIRED',
    });
    expect(
      await fixture.prisma.communityPointFacetReceipt.count({
        where: { eventId: q.event.eventId },
      }),
    ).toBe(0);
    expect(await ledger.balance(userId)).toBe(0);
  });

  it('rejects ledger/recipient mismatches while adopting legacy evidence', async () => {
    const q = qualify();
    expect((await oldConsume(q)).status).toBe('AWARDED');
    const other = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: other,
        username: other,
        email: `${other}@dss.test`,
        passwordHash: 'synthetic-not-login-evidence',
      },
    });
    const wrong = JSON.parse(JSON.stringify(q)) as QualifiedPointCommand;
    wrong.recipientId = other;
    wrong.facts[0].qualification.recipientId = other;
    expect(await service.advance(wrong)).toEqual({
      status: 'BLOCKED',
      code: 'LEGACY_EVIDENCE_REQUIRED',
    });
    expect(await ledger.balance(other)).toBe(0);
    expect(await ledger.balance(userId)).toBe(10);
  });

  it('rejects cursor regression and an inconsistent receipt through actual SQL guards', async () => {
    const q = qualify(),
      w = withdraw(q);
    expect((await oldConsume(q)).status).toBe('AWARDED');
    expect((await service.advance(w)).status).toBe('COMPLETE');
    const original = await fixture.prisma.communityPointEntry.findUniqueOrThrow(
      { where: { sourceEventId: q.event.eventId } },
    );
    const cursor =
      await fixture.prisma.communityPointSourceCursor.findUniqueOrThrow({
        where: {
          producer_sourceKind_sourceId: {
            producer: q.event.producer,
            sourceKind: q.event.sourceType!,
            sourceId: q.event.sourceId!,
          },
        },
      });
    await expect(
      controls.query(
        'UPDATE "community_point_source_cursors" SET "retiredThroughRevision"=0 WHERE id=$1',
        [cursor.id],
      ),
    ).rejects.toThrow('cannot regress');
    await expect(
      controls.query(
        'DELETE FROM "community_point_source_cursors" WHERE id=$1',
        [cursor.id],
      ),
    ).rejects.toThrow('cannot be deleted');
    await expect(
      controls.query(
        `INSERT INTO "community_point_facet_receipts" ("eventId",facet,"contractVersion","commandDigest","recipientId",disposition,"ruleKey","contributionEntryId") VALUES ($1,'CONTRIBUTION',1,$2,$3,'APPLIED',$4,$5)`,
        [randomUUID(), '0'.repeat(64), userId, ruleKey, original.id],
      ),
    ).rejects.toThrow('cannot claim another contribution');
    expect(await ledger.balance(userId)).toBe(0);
  });
  it.each([
    'audit_records',
    'outbox_events',
    'community_point_facet_receipts',
  ] as const)(
    'rolls back the current facet on %s failure while preserving completed control',
    async (table) => {
      const q = qualify();
      const predicate =
        table === 'community_point_facet_receipts'
          ? `IF NEW."facet" = 'CONTRIBUTION' THEN RAISE EXCEPTION 'synthetic facet failure'; END IF;`
          : `RAISE EXCEPTION 'synthetic facet failure';`;
      await controls.query(
        `CREATE FUNCTION "${fixture.schema}".fail_point_facet() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN ${predicate} RETURN NEW; END $body$`,
      );
      await controls.query(
        `CREATE TRIGGER fail_point_facet BEFORE INSERT ON "${fixture.schema}"."${table}" FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".fail_point_facet()`,
      );
      try {
        await expect(service.advance(q)).rejects.toBeDefined();
        expect(await ledger.balance(userId)).toBe(0);
        expect(
          await fixture.prisma.communityPointFacetReceipt.findUnique({
            where: {
              eventId_facet: { eventId: q.event.eventId, facet: 'CONTROL' },
            },
          }),
        ).toMatchObject({ disposition: 'NO_SOURCE_EFFECT' });
        expect(
          await fixture.prisma.communityPointFacetReceipt.findUnique({
            where: {
              eventId_facet: {
                eventId: q.event.eventId,
                facet: 'CONTRIBUTION',
              },
            },
          }),
        ).toBeNull();
        expect(
          await fixture.prisma.communityPointQualification.count({
            where: { fact: { qualificationEventId: q.event.eventId } },
          }),
        ).toBe(0);
      } finally {
        await controls.query(
          `DROP TRIGGER fail_point_facet ON "${fixture.schema}"."${table}"`,
        );
        await controls.query(
          `DROP FUNCTION "${fixture.schema}".fail_point_facet()`,
        );
      }
      expect(await service.advance(q)).toEqual(
        complete([
          facet('CONTROL', 'NO_SOURCE_EFFECT', true),
          facet('CONTRIBUTION', 'APPLIED'),
        ]),
      );
      expect(await ledger.balance(userId)).toBe(10);
    },
  );
});
