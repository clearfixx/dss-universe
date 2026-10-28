/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Routing Query Verification
 * 📄 File: apps/api/test/gamification-routing-query-work.e2e-spec.ts
 * 🎯 Purpose: Measures bounded coordinate queries against synthetic retained history.
 * 🧠 Responsibilities: Exercises actual owner SQL and root discovery over mostly-routed rows.
 * 🏗️ Architecture: Private migrated schema with 100000 synthetic source rows.
 * ⚠️ Important: This is a repeatable regression dataset, not a production capacity SLA.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Pool } from 'pg';
import { Prisma } from '@prisma/client';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { outboxRoutingWindow } from '@api/core/events/infrastructure';
import { PrismaRoutingControlRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository';
import { PrismaRoutingDiscoveryRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-discovery.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
type PlanNode = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Actual Rows': number;
  Plans?: PlanNode[];
};
type PlanReport = { Plan: PlanNode; 'Execution Time': number };
function nodes(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(nodes)];
}
describe('Routing source query-work characterization', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let pool: Pool;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    const control = new PrismaRoutingControlRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
    );
    const operator = {
      actorId: 'synthetic:scale',
      actorType: 'SERVICE',
    } as const;
    await control.prepare(operator);
    await control.activate(operator, 0n, 'synthetic:scale-preflight');
    await pool.query(`INSERT INTO outbox_events
      (id,"eventName","eventVersion","eventCategory",producer,payload,status,"occurredAt","createdAt","updatedAt")
      SELECT gen_random_uuid(),'synthetic.scale.v1',1,'integration','synthetic','{}',
        (CASE g%4 WHEN 0 THEN 'PENDING' WHEN 1 THEN 'PROCESSING' WHEN 2 THEN 'PUBLISHED' ELSE 'FAILED' END)::"OutboxStatus",
        a.cutoff, a.cutoff+(g-50000)*interval '1 millisecond',a.cutoff
      FROM gamification_activations a CROSS JOIN generate_series(1,100000) AS g`);
    await pool.query(`INSERT INTO gamification_deliveries (destination,"eventId")
      SELECT a.destination,e.id FROM gamification_activations a JOIN outbox_events e ON e."createdAt">=a.cutoff
      ORDER BY e."createdAt",e.id LIMIT 45000`);
    await pool.query('ANALYZE outbox_events');
    await pool.query('ANALYZE gamification_deliveries');
  }, 60000);
  afterAll(async () => {
    try {
      await pool?.end();
    } finally {
      await fixture?.close();
    }
  });
  it('uses coordinate index scans for initial and positioned bounded batches without scanning routed payloads', async () => {
    const cutoff = Prisma.sql`(SELECT cutoff FROM gamification_activations WHERE destination='gamification.v1')`;
    const discovery = new PrismaRoutingDiscoveryRepository(fixture.prisma);
    expect(await discovery.forward()).toMatchObject({
      examined: 256,
      inserted: 0,
    });
    expect(await discovery.forward()).toMatchObject({
      examined: 256,
      inserted: 0,
    });
    const after = Prisma.sql`(SELECT "forwardAt","forwardId" FROM gamification_discovery WHERE destination='gamification.v1')`;
    for (const positioned of [false, true]) {
      if (positioned) {
        // Fixture positioning is outside the measured source query, like a persisted cursor.
        await pool.query(`WITH last_key AS (
          SELECT e."createdAt",e.id FROM outbox_events e JOIN gamification_activations a
          ON e."createdAt"=a.cutoff+44999*interval '1 millisecond'
          ORDER BY e.id DESC LIMIT 1)
          UPDATE gamification_discovery SET "forwardAt"=last_key."createdAt","forwardId"=last_key.id FROM last_key`);
      }
      const sql = outboxRoutingWindow({
        cutoff,
        after: positioned ? after : undefined,
        limit: 256,
      });
      const result = await pool.query<{ 'QUERY PLAN': PlanReport[] }>(
        `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${sql.text}`,
        sql.values,
      );
      const report = result.rows[0]['QUERY PLAN'][0];
      const sourceNodes = nodes(report.Plan).filter(
        (node) => node['Relation Name'] === 'outbox_events',
      );
      expect(sourceNodes.length).toBeGreaterThan(0);
      expect(
        sourceNodes.every((node) => node['Node Type'] !== 'Seq Scan'),
      ).toBe(true);
      expect(
        sourceNodes.some(
          (node) => node['Index Name'] === 'outbox_routing_coordinate_idx',
        ),
      ).toBe(true);
      expect(report.Plan['Actual Rows']).toBe(256);
      console.info('synthetic-routing-query-plan', {
        positioned,
        sourceRows: 100000,
        alreadyRouted: 45000,
        selected: 256,
        executionMs: report['Execution Time'],
      });
    }
    expect(await discovery.forward()).toMatchObject({
      examined: 256,
      inserted: 256,
    });
    expect(
      await fixture.prisma.gamificationDiscovery.findUnique({
        where: { destination: 'gamification.v1' },
      }),
    ).toMatchObject({ examined: 768n });
  });
});
