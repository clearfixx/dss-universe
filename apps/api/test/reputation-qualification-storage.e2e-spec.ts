/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Qualification Storage Tests
 * 📄 File: apps/api/test/reputation-qualification-storage.e2e-spec.ts
 * 🎯 Purpose: Proves immutable provenance, pointer constraints and actual bounded query plans.
 * 🧠 Responsibilities: Uses migrated storage and large synthetic histories without planner overrides.
 * 🏗️ Architecture: Owned storage fixtures; real producer/API behavior is proved in separate integration suites.
 * ⚠️ Important: Setup population is not part of per-event query work or a production latency SLA.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { OutboxWriterService, createEventEnvelope } from '@api/core/events';
import { CanonicalOutboxReader } from '@api/core/events/infrastructure';
import { canonicalOutboxCandidatesQuery } from '../src/core/events/infrastructure/canonical-outbox.reader';
import { PrismaReputationQualificationWriter } from '../src/modules/reputation/infrastructure/repositories/prisma-reputation-qualification.writer';
import { PrismaReputationQualificationReader } from '../src/modules/reputation/infrastructure/repositories/prisma-reputation-qualification.reader';
import { reputationQualificationWindow } from '../src/modules/reputation/infrastructure/repositories/reputation-qualification-window.sql';
import { ReputationQualificationAdapter } from '../src/composition/reputation/infrastructure/reputation-qualification.adapter';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type PlanNode = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Rows Removed by Filter'?: number;
  Plans?: PlanNode[];
};
describe('Reputation qualification storage and bounded work (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let actorId: string, recipientId: string;
  const writer = new PrismaReputationQualificationWriter();
  const core = new CanonicalOutboxReader();
  const outbox = new OutboxWriterService();
  const ambiguous = {
    producer: 'dss.api.reputation',
    aggregateType: 'ReputationEntry',
    aggregateId: 'synthetic-p1-ambiguous',
    eventName: 'reputation.direct.changed.v1',
  };
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    actorId = randomUUID();
    recipientId = randomUUID();
    await fixture.prisma.user.createMany({
      data: [actorId, recipientId].map((id) => ({
        id,
        username: id,
        email: `${id}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      })),
    });
    await fixture.prisma
      .$executeRaw`INSERT INTO reputation_entries (id,"actorId","recipientId",value,reason)
      SELECT 'synthetic-p1-history-'||s,${actorId},${recipientId},1,'Synthetic history' FROM generate_series(1,2048) s`;
    await fixture.prisma.$executeRaw`WITH events AS (
      INSERT INTO outbox_events (id,"eventName","eventVersion","eventCategory",producer,"aggregateType","aggregateId","actorId",payload,"occurredAt","updatedAt")
      SELECT gen_random_uuid(),'reputation.direct.changed.v1',1,'integration','dss.api.reputation','ReputationEntry',id,${actorId},
        jsonb_build_object('recipientId',${recipientId}::text,'value',1),TIMESTAMP '2026-01-01 00:00:00',NOW()
      FROM reputation_entries WHERE id LIKE 'synthetic-p1-history-%' RETURNING id,"aggregateId")
      INSERT INTO reputation_qualification_events (id,"eventId","entryId",kind,"actorId","recipientId",value,"occurredAt",provenance)
      SELECT gen_random_uuid(),id,"aggregateId",'DIRECT',${actorId},${recipientId},1,TIMESTAMP '2026-01-01 00:00:00','NATIVE' FROM events`;
    await fixture.prisma.$executeRaw`WITH facts AS (
      SELECT gen_random_uuid() AS id,id AS binding,"entryId" FROM reputation_qualification_events)
      INSERT INTO reputation_qualification_facts (id,"eventBindingId",scope,"scopeEntryId",revision,action,"qualificationFactId")
      SELECT id,binding,'ENTRY',"entryId",1,'QUALIFY',id FROM facts`;
    await fixture.prisma
      .$executeRaw`INSERT INTO reputation_qualification_states ("originalEntryId",status,revision,"qualificationFactId","currentFactId")
      SELECT "scopeEntryId",'ACTIVE',1,id,id FROM reputation_qualification_facts`;
    await fixture.prisma
      .$executeRaw`INSERT INTO outbox_events (id,"eventName","eventVersion","eventCategory",producer,"aggregateType","aggregateId",payload,"occurredAt","updatedAt")
      SELECT gen_random_uuid(),'reputation.direct.changed.v1',1,'integration','dss.api.reputation','ReputationEntry',${ambiguous.aggregateId},
        jsonb_build_object('recipientId',${recipientId}::text,'value',1),TIMESTAMP '2026-01-01 00:00:00',NOW() FROM generate_series(1,1024)`;
    for (const table of [
      'outbox_events',
      'reputation_qualification_events',
      'reputation_qualification_facts',
      'reputation_qualification_states',
    ])
      await fixture.prisma.$executeRawUnsafe(`ANALYZE ${table}`);
  }, 60000);
  afterAll(async () => {
    await fixture?.close();
  });

  async function original() {
    return fixture.prisma.$transaction(async (transaction) => {
      const entry = await transaction.reputationEntry.create({
        data: {
          actorId,
          recipientId,
          value: 1,
          reason: 'Synthetic storage decision',
        },
      });
      const envelope = createEventEnvelope({
        name: 'reputation.direct.changed.v1',
        version: 1,
        category: 'integration',
        producer: 'dss.api.reputation',
        actorId,
        aggregate: { type: 'ReputationEntry', id: entry.id },
        payload: { recipientId, value: 1 },
      });
      await outbox.append(transaction, envelope);
      const state = await writer.direct(transaction, {
        entryId: entry.id,
        actorId,
        recipientId,
        value: 1,
        eventId: envelope.id,
        occurredAt: envelope.occurredAt,
      });
      const binding =
        await transaction.reputationQualificationEvent.findUniqueOrThrow({
          where: { eventId: envelope.id },
        });
      return { entry, state, binding };
    });
  }
  async function reversal(s: Awaited<ReturnType<typeof original>>) {
    return fixture.prisma.$transaction(async (transaction) => {
      const entry = await transaction.reputationEntry.create({
        data: {
          actorId,
          recipientId,
          value: -1,
          reason: 'Synthetic storage reversal',
          reversesEntryId: s.entry.id,
        },
      });
      const envelope = createEventEnvelope({
        name: 'reputation.direct.reversed.v1',
        version: 1,
        category: 'integration',
        producer: 'dss.api.reputation',
        actorId,
        aggregate: { type: 'ReputationEntry', id: entry.id },
        payload: { recipientId, value: -1, reversesEntryId: s.entry.id },
      });
      await outbox.append(transaction, envelope);
      await writer.reverse(
        transaction,
        {
          entryId: entry.id,
          actorId,
          recipientId,
          value: -1,
          eventId: envelope.id,
          occurredAt: envelope.occurredAt,
        },
        s.entry.id,
        () => {
          throw new Error(
            'Native storage fixture must not perform legacy lookup.',
          );
        },
      );
      return transaction.reputationQualificationEvent.findUniqueOrThrow({
        where: { eventId: envelope.id },
      });
    });
  }
  function flatten(plan: PlanNode): PlanNode[] {
    return [plan, ...(plan.Plans ?? []).flatMap(flatten)];
  }
  function work(nodes: PlanNode[]) {
    return nodes.map((node) => ({
      relation: node['Relation Name'],
      node: node['Node Type'],
      index: node['Index Name'],
      rows: node['Actual Rows'],
      loops: node['Actual Loops'],
      filtered: node['Rows Removed by Filter'] ?? 0,
    }));
  }
  async function explain(query: Prisma.Sql) {
    const result = await fixture.prisma.$queryRaw<
      { 'QUERY PLAN': { Plan: PlanNode }[] }[]
    >(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
    return flatten(result[0]['QUERY PLAN'][0].Plan);
  }

  it.each([
    'event-update',
    'event-delete',
    'fact-update',
    'fact-delete',
    'state-delete',
  ])('rejects %s without modifying persisted history', async (operation) => {
    const s = await original();
    const failure =
      operation === 'event-update'
        ? fixture.prisma.reputationQualificationEvent.update({
            where: { id: s.binding.id },
            data: { value: -1 },
          })
        : operation === 'event-delete'
          ? fixture.prisma.reputationQualificationEvent.delete({
              where: { id: s.binding.id },
            })
          : operation === 'fact-update'
            ? fixture.prisma.reputationQualificationFact.update({
                where: { id: s.state.qualificationFactId! },
                data: { revision: 2n },
              })
            : operation === 'fact-delete'
              ? fixture.prisma.reputationQualificationFact.delete({
                  where: { id: s.state.qualificationFactId! },
                })
              : fixture.prisma.reputationQualificationState.delete({
                  where: { originalEntryId: s.entry.id },
                });
    await expect(failure).rejects.toThrow(
      'Reputation qualification history is immutable',
    );
    expect(
      await fixture.prisma.reputationQualificationState.findUnique({
        where: { originalEntryId: s.entry.id },
      }),
    ).toEqual(s.state);
  });

  it('rejects foreign qualification, backwards and unbacked state pointers', async () => {
    const a = await original(),
      b = await original();
    const binding = await reversal(a);
    await expect(
      fixture.prisma.reputationQualificationFact.create({
        data: {
          id: randomUUID(),
          eventBindingId: binding.id,
          scope: 'ENTRY',
          scopeEntryId: a.entry.id,
          revision: 2n,
          action: 'WITHDRAW',
          qualificationFactId: b.state.qualificationFactId!,
        },
      }),
    ).rejects.toThrow('Invalid Reputation withdrawal qualification');
    await expect(
      fixture.prisma.reputationQualificationState.update({
        where: { originalEntryId: a.entry.id },
        data: {
          status: 'ACTIVE',
          revision: 1n,
          currentFactId: a.state.qualificationFactId,
        },
      }),
    ).rejects.toThrow('cannot move backwards');
    await expect(
      fixture.prisma.reputationQualificationState.update({
        where: { originalEntryId: b.entry.id },
        data: { status: 'WITHDRAWN', revision: 2n, currentFactId: null },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.reputationQualificationEvent.create({
        data: {
          id: randomUUID(),
          eventId: randomUUID(),
          entryId: b.entry.id,
          kind: 'DIRECT',
          actorId: recipientId,
          recipientId,
          value: 1,
          occurredAt: new Date(),
          provenance: 'NATIVE',
        },
      }),
    ).rejects.toThrow('does not match its ledger entry');
  });

  it('retains native UUID identity and no foreign Core Outbox lifetime constraint', async () => {
    const rows = await fixture.prisma.$queryRaw<
      { table_name: string; column_name: string; udt_name: string }[]
    >`SELECT table_name,column_name,udt_name FROM information_schema.columns
      WHERE table_schema=${fixture.schema} AND table_name='reputation_qualification_events' AND column_name IN ('id','eventId') ORDER BY column_name`;
    expect(rows).toEqual([
      {
        table_name: 'reputation_qualification_events',
        column_name: 'eventId',
        udt_name: 'uuid',
      },
      {
        table_name: 'reputation_qualification_events',
        column_name: 'id',
        udt_name: 'uuid',
      },
    ]);
    const foreignKeys = await fixture.prisma.$queryRaw<
      { conname: string }[]
    >`SELECT c.conname FROM pg_constraint c
      JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace n ON n.oid=child.relnamespace
      JOIN pg_class parent ON parent.oid=c.confrelid WHERE c.contype='f' AND n.nspname=${fixture.schema}
      AND child.relname LIKE 'reputation_qualification_%' AND parent.relname='outbox_events'`;
    expect(foreignKeys).toEqual([]);
  });

  it('limits actual canonical candidate reads to two despite 1024 same-coordinate rows', async () => {
    const candidates = await fixture.prisma.$transaction((transaction) =>
      core.candidates(transaction, ambiguous, ['recipientId', 'value']),
    );
    expect(candidates).toHaveLength(2);
    const nodes = await explain(canonicalOutboxCandidatesQuery(ambiguous));
    const source = nodes.filter(
      (node) => node['Relation Name'] === 'outbox_events',
    );
    process.stdout.write(
      JSON.stringify({
        measurement: 'p1-canonical-work',
        population: 1024,
        returned: candidates.length,
        nodes: work(source),
      }) + '\n',
    );
    expect(source.length).toBeGreaterThan(0);
    expect(
      source.some(
        (node) => node['Index Name'] === 'outbox_producer_evidence_idx',
      ),
    ).toBe(true);
    for (const node of source) {
      expect(node['Node Type']).not.toBe('Seq Scan');
      expect(
        (node['Actual Rows'] ?? 0) * (node['Actual Loops'] ?? 0),
      ).toBeLessThanOrEqual(2);
      expect(
        (node['Rows Removed by Filter'] ?? 0) * (node['Actual Loops'] ?? 0),
      ).toBe(0);
    }
  });

  it('uses bounded owner/root reads against 2048 unrelated qualification histories', async () => {
    const s = await original();
    const binding = await reversal(s);
    const reader = new PrismaReputationQualificationReader();
    const root = new ReputationQualificationAdapter(
      fixture.prisma,
      reader,
      core,
    );
    fixture.queries.length = 0;
    const prepared = await root.prepare(binding.eventId);
    expect(prepared.status).toBe('READY');
    if (prepared.status === 'READY')
      expect(prepared.command.facts).toHaveLength(3);
    expect(fixture.queries.length).toBeLessThanOrEqual(12);
    const clientQueries = fixture.queries.length;
    const nodes = await explain(
      reputationQualificationWindow(s.entry.id, binding.id),
    );
    const source = nodes.filter((node) =>
      node['Relation Name']?.startsWith('reputation_qualification_'),
    );
    process.stdout.write(
      JSON.stringify({
        measurement: 'p1-owner-work',
        unrelatedHistories: 2048,
        clientQueries,
        nodes: work(source),
      }) + '\n',
    );
    expect(source.length).toBeGreaterThan(0);
    for (const node of source) {
      expect(node['Node Type']).not.toBe('Seq Scan');
      expect(
        (node['Actual Rows'] ?? 0) * (node['Actual Loops'] ?? 0),
      ).toBeLessThanOrEqual(4);
      expect(
        (node['Rows Removed by Filter'] ?? 0) * (node['Actual Loops'] ?? 0),
      ).toBeLessThanOrEqual(1);
    }
  });
});
