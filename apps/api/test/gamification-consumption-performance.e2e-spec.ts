/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Consumption Query Work Verification
 * 📄 File: apps/api/test/gamification-consumption-performance.e2e-spec.ts
 * 🎯 Purpose: Measures actual due/recovery SQL over thousands of unrelated receipts.
 * 🧠 Responsibilities: Proves indexed bounded lanes and future-lease range exclusion.
 * 🏗️ Architecture: Synthetic migrated query fixture, not producer or economic-effect acceptance.
 * ⚠️ Important: No forced planner settings, clock changes or latency-SLA claim.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { createConsumptionFixture } from './helpers/gamification-consumption.fixture';
import { encodeAdmissionSeal } from '../src/composition/gamification-delivery/infrastructure/admission-seal.codec';
import {
  dueConsumptionQuery,
  expiredConsumptionQuery,
} from '../src/composition/gamification-delivery/infrastructure/consumption-queries';

type Plan = {
  'Node Type': string;
  'Index Name'?: string;
  'Relation Name'?: string;
  'Actual Rows': number;
  'Actual Loops': number;
  'Rows Removed by Filter'?: number;
  Plans?: Plan[];
};
function nodes(plan: Plan): Plan[] {
  return [plan, ...(plan.Plans ?? []).flatMap(nodes)];
}

describe('Consumption actual query work', () => {
  let h: Awaited<ReturnType<typeof createConsumptionFixture>>;
  beforeAll(async () => {
    h = await createConsumptionFixture();
    await h.add();
    const seed = await h.prisma.gamificationAdmission.findFirstOrThrow();
    const prototype = encodeAdmissionSeal(seed.projection).projection;
    const data = Array.from({ length: 8192 }, () => {
      const id = randomUUID(),
        eventId = randomUUID(),
        factId = randomUUID();
      const projection = JSON.parse(
        JSON.stringify(prototype),
      ) as typeof prototype;
      projection.canonical.eventId = eventId;
      projection.canonical.sourceId = `synthetic:${id}`;
      const command = projection.inputs.ACHIEVEMENTS.command;
      command.event.eventId = eventId;
      command.event.sourceId = projection.canonical.sourceId;
      Object.assign(command.facts[0], {
        sourceId: projection.canonical.sourceId,
        factId,
        canonicalEventId: eventId,
        qualificationId: factId,
        qualificationEventId: eventId,
        qualificationFactId: factId,
      });
      if (!command.contribution)
        throw new Error('Missing fixture contribution.');
      command.contribution.factId = factId;
      const encoded = encodeAdmissionSeal(projection);
      return {
        id,
        eventId,
        sourceId: projection.canonical.sourceId,
        projection: encoded.projection,
        digest: encoded.digest.toString('hex'),
        encodedBytes: encoded.encodedBytes,
        payload: command.event.payload,
      };
    });
    await h.prisma.$executeRaw`WITH input AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(data)}::jsonb)
        AS i(id uuid,"eventId" uuid,"sourceId" text,projection jsonb,digest text,"encodedBytes" integer,payload jsonb)
    ), events AS (
      INSERT INTO outbox_events (id,"eventName","eventVersion","eventCategory",producer,"aggregateType","aggregateId",payload,"occurredAt","createdAt","updatedAt")
      SELECT "eventId",'reputation.direct.changed.v1',1,'integration','dss.api.reputation','ReputationEntry',"sourceId",payload,${seed.cutoff},${new Date(seed.cutoff.getTime() + 1)},NOW() FROM input RETURNING id
    ), deliveries AS (
      INSERT INTO gamification_deliveries (destination,"eventId") SELECT 'gamification.v1',id FROM events RETURNING "eventId"
    ), admissions AS (
      INSERT INTO gamification_admissions (id,destination,"eventId",cutoff,"descriptorId","descriptorVersion","codecVersion",projection,"projectionDigest","encodedBytes")
      SELECT i.id,'gamification.v1',i."eventId",${seed.cutoff},'reputation.qualification',1,1,i.projection,decode(i.digest,'hex'),i."encodedBytes"
      FROM input i JOIN deliveries d ON d."eventId"=i."eventId" RETURNING id
    ) INSERT INTO gamification_consumption_receipts ("admissionId",destination,"availableAt","pointsDone","levelsDone","achievementsDone")
      SELECT id,'gamification.v1',timezone('UTC',clock_timestamp())-interval '60 seconds',true,true,false FROM admissions`;
    await h.pool
      .query(`UPDATE gamification_consumption_receipts SET state='RUNNING',"availableAt"=NULL,"claimSequence"=1,
      "claimToken"=gen_random_uuid(),"claimedAt"=timezone('UTC',clock_timestamp())-interval '120 seconds',"leaseUntil"=timezone('UTC',clock_timestamp())-interval '60 seconds'
      WHERE "admissionId" IN (SELECT "admissionId" FROM gamification_consumption_receipts ORDER BY "admissionId" LIMIT 4096)`);
    await h.pool
      .query(`INSERT INTO gamification_consumption_attempts (id,"admissionId",epoch,"claimSequence","claimToken","startedAt")
      SELECT gen_random_uuid(),"admissionId",epoch,"claimSequence","claimToken","claimedAt" FROM gamification_consumption_receipts WHERE state='RUNNING'`);
    await h.pool
      .query(`UPDATE gamification_consumption_receipts SET state='RETRY_DUE',"technicalFailures"=1,"availableAt"=timezone('UTC',clock_timestamp())-interval '60 seconds',
      "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE state='RUNNING'`);
    await h.pool.query(
      `UPDATE gamification_consumption_attempts SET state='FAILED',code='OWNER_FAILURE',"finishedAt"=timezone('UTC',clock_timestamp()) WHERE state='OPEN'`,
    );
    await h.pool.query('ANALYZE gamification_consumption_receipts');
  }, 60000);
  afterAll(async () => {
    await h?.close();
  });

  async function explain(query: Prisma.Sql) {
    const [row] = await h.prisma.$queryRaw<
      { 'QUERY PLAN': { Plan: Plan }[] }[]
    >(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query}`);
    return row['QUERY PLAN'][0].Plan;
  }

  it('merges two indexed locked lanes without scanning unrelated due history', async () => {
    expect(await h.prisma.gamificationConsumptionReceipt.count()).toBe(8193);
    const plan = await explain(dueConsumptionQuery(32));
    const source = nodes(plan).filter(
      (node) => node['Relation Name'] === 'gamification_consumption_receipts',
    );
    expect(plan['Actual Rows']).toBe(32);
    expect(source).toHaveLength(2);
    for (const node of source) {
      expect(node['Index Name']).toBe('gamification_consumption_due_idx');
      expect(node['Actual Rows'] * node['Actual Loops']).toBeLessThanOrEqual(
        32,
      );
      expect(node['Rows Removed by Filter'] ?? 0).toBe(0);
    }
    console.info(
      JSON.stringify({
        kind: 'c21-due-query-plan',
        fixture: 8193,
        returned: plan['Actual Rows'],
        lanes: source.map((node) => ({
          index: node['Index Name'],
          rows: node['Actual Rows'],
          loops: node['Actual Loops'],
        })),
      }),
    );
  });

  it('excludes future leases by index range rather than filtering every running receipt', async () => {
    // Future data is a query fixture, not a change to the runtime 60-second lease.
    await h.pool
      .query(`UPDATE gamification_consumption_receipts SET state='RUNNING',"availableAt"=NULL,"claimSequence"="claimSequence"+1,
      "claimToken"=gen_random_uuid(),"claimedAt"=timezone('UTC',clock_timestamp()),"leaseUntil"=timezone('UTC',clock_timestamp())+interval '1 day'
      WHERE state IN ('READY','RETRY_DUE')`);
    await h.pool
      .query(`INSERT INTO gamification_consumption_attempts (id,"admissionId",epoch,"claimSequence","claimToken","startedAt")
      SELECT gen_random_uuid(),"admissionId",epoch,"claimSequence","claimToken","claimedAt" FROM gamification_consumption_receipts WHERE state='RUNNING'`);
    await h.pool.query('ANALYZE gamification_consumption_receipts');
    const plan = await explain(expiredConsumptionQuery(32));
    const source = nodes(plan).filter(
      (node) => node['Relation Name'] === 'gamification_consumption_receipts',
    );
    expect(plan['Actual Rows']).toBe(0);
    expect(source).toHaveLength(1);
    expect(source[0]['Index Name']).toBe('gamification_consumption_lease_idx');
    expect(source[0]['Actual Rows']).toBe(0);
    expect(source[0]['Rows Removed by Filter'] ?? 0).toBe(0);
    console.info(
      JSON.stringify({
        kind: 'c21-expired-query-plan',
        fixture: 8193,
        index: source[0]['Index Name'],
        rows: 0,
        filtered: source[0]['Rows Removed by Filter'] ?? 0,
      }),
    );
  });
});
