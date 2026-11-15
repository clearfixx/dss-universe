/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Consumption Storage Verification
 * 📄 File: apps/api/test/gamification-consumption-storage.e2e-spec.ts
 * 🎯 Purpose: Exercises real migrated C2.1 constraints and transition guards.
 * 🧠 Responsibilities: Proves storage negatives without pretending SQL is producer attestation.
 * 🏗️ Architecture: Owned disposable schema; no queue, owner effects or activation outside fixtures.
 * ⚠️ Important: Codec and repository CAS need separate regression suites.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { PrismaRoutingControlRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Inactive gamification consumption storage', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let pool: Pool;
  let cutoff: Date;
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
      actorId: 'synthetic:c21-storage',
      actorType: 'SERVICE' as const,
    };
    await control.prepare(operator);
    const active = await control.activate(
      operator,
      0n,
      'synthetic:storage-only',
    );
    if (!active.cutoff) throw new Error('Fixture cutoff missing.');
    cutoff = active.cutoff;
  }, 60000);
  afterAll(async () => {
    try {
      await pool?.end();
    } finally {
      await fixture?.close();
    }
  });

  async function delivery() {
    const eventId = randomUUID();
    await fixture.prisma.outboxEvent.create({
      data: {
        id: eventId,
        eventName: 'synthetic.c21.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        producer: 'synthetic',
        payload: {},
        occurredAt: cutoff,
        createdAt: new Date(cutoff.getTime() + 1),
      },
    });
    await fixture.prisma.gamificationDelivery.create({
      data: {
        destination: 'gamification.v1',
        eventId,
      },
    });
    return eventId;
  }
  async function seal() {
    const id = randomUUID();
    const eventId = await delivery();
    await pool.query(
      `INSERT INTO gamification_admissions
      (id,destination,"eventId",cutoff,"descriptorId","descriptorVersion","codecVersion",projection,"projectionDigest","encodedBytes")
      VALUES ($1,'gamification.v1',$2,$3,'synthetic.storage',1,1,'{}',decode(repeat('00',32),'hex'),2)`,
      [id, eventId, cutoff],
    );
    return { id, eventId };
  }
  async function receipt() {
    const { id } = await seal();
    await pool.query(
      `INSERT INTO gamification_consumption_receipts
      ("admissionId",destination,"availableAt","pointsDone","levelsDone","achievementsDone")
      VALUES ($1,'gamification.v1',NOW(),true,true,false)`,
      [id],
    );
    return id;
  }
  async function running() {
    const id = await receipt();
    const token = randomUUID();
    await pool.query(
      `UPDATE gamification_consumption_receipts SET state='RUNNING',
      "availableAt"=NULL,"claimSequence"=1,"claimToken"=$2,"claimedAt"=NOW(),"leaseUntil"=NOW()+interval '60 seconds'
      WHERE "admissionId"=$1`,
      [id, token],
    );
    return { id, token };
  }

  it.each(['UPDATE', 'DELETE'] as const)(
    'rejects admission %s',
    async (operation) => {
      const { id } = await seal();
      const sql =
        operation === 'UPDATE'
          ? 'UPDATE gamification_admissions SET "encodedBytes"=3 WHERE id=$1'
          : 'DELETE FROM gamification_admissions WHERE id=$1';
      await expect(pool.query(sql, [id])).rejects.toMatchObject({
        code: 'P0001',
      });
    },
  );

  it('requires a real delivery and unique event identity', async () => {
    const { id, eventId } = await seal();
    await expect(
      pool.query(
        `INSERT INTO gamification_admissions
      SELECT $1,destination,"eventId",cutoff,"descriptorId","descriptorVersion","codecVersion",projection,"projectionDigest","encodedBytes","createdAt"
      FROM gamification_admissions WHERE id=$2`,
        [randomUUID(), id],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        `INSERT INTO gamification_admissions
        SELECT $1,destination,$3,cutoff,"descriptorId","descriptorVersion","codecVersion",projection,"projectionDigest","encodedBytes","createdAt"
        FROM gamification_admissions WHERE id=$2`,
        [randomUUID(), id, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    expect(eventId).not.toBe(id);
  });

  it.each([
    ['zero bytes', '0', '"encodedBytes"'],
    ['oversize encoding', '262145', '"encodedBytes"'],
    ['unsupported codec', '2', '"codecVersion"'],
    ['short digest', "decode('00','hex')", '"projectionDigest"'],
    ['non-object projection', "'null'::jsonb", 'projection'],
  ])(
    'rejects invalid admission shape: %s',
    async (_name, expression, column) => {
      const { id } = await seal();
      const newEvent = await delivery();
      const columns = [
        'id',
        'destination',
        '"eventId"',
        'cutoff',
        '"descriptorId"',
        '"descriptorVersion"',
        '"codecVersion"',
        'projection',
        '"projectionDigest"',
        '"encodedBytes"',
        '"createdAt"',
      ];
      const projection = columns
        .map((field) =>
          field === 'id'
            ? '$1'
            : field === '"eventId"'
              ? '$3'
              : field === column
                ? expression
                : field,
        )
        .join(',');
      await expect(
        pool.query(
          `INSERT INTO gamification_admissions SELECT ${projection} FROM gamification_admissions WHERE id=$2`,
          [randomUUID(), id, newEvent],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    },
  );

  it('does not permit READY to COMPLETE, epoch change, or receipt deletion', async () => {
    const id = await receipt();
    await expect(
      pool.query(
        `UPDATE gamification_consumption_receipts SET state='COMPLETE',"availableAt"=NULL,"achievementsDone"=true WHERE "admissionId"=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        `UPDATE gamification_consumption_receipts SET epoch=1 WHERE "admissionId"=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        'DELETE FROM gamification_consumption_receipts WHERE "admissionId"=$1',
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('allows a final owner completion but never reopens COMPLETE', async () => {
    const { id } = await running();
    await pool.query(
      `UPDATE gamification_consumption_receipts SET state='COMPLETE',"achievementsDone"=true,
      "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE "admissionId"=$1`,
      [id],
    );
    await expect(
      pool.query(
        `UPDATE gamification_consumption_receipts SET state='READY',"availableAt"=NOW() WHERE "admissionId"=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('requires an incremented failure for RETRY_DUE and preserves completed owners', async () => {
    const { id } = await running();
    await expect(
      pool.query(
        `UPDATE gamification_consumption_receipts SET state='RETRY_DUE',"availableAt"=NOW(),
      "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE "admissionId"=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        `UPDATE gamification_consumption_receipts SET "pointsDone"=false WHERE "admissionId"=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await pool.query(
      `UPDATE gamification_consumption_receipts SET state='RETRY_DUE',"technicalFailures"=1,"availableAt"=NOW(),
      "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE "admissionId"=$1`,
      [id],
    );
    const result = await pool.query(
      'SELECT "pointsDone","technicalFailures" FROM gamification_consumption_receipts WHERE "admissionId"=$1',
      [id],
    );
    expect(result.rows).toEqual([{ pointsDone: true, technicalFailures: 1 }]);
  });

  it('keeps continued work separate from the failure counter', async () => {
    const { id } = await running();
    await pool.query(
      `UPDATE gamification_consumption_receipts SET state='READY',"availableAt"=NOW(),
      "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE "admissionId"=$1`,
      [id],
    );
    const result = await pool.query(
      'SELECT "technicalFailures","claimSequence"::text FROM gamification_consumption_receipts WHERE "admissionId"=$1',
      [id],
    );
    expect(result.rows).toEqual([{ technicalFailures: 0, claimSequence: '1' }]);
  });

  it('settles an attempt only once and never changes its token', async () => {
    const { id, token } = await running();
    const attempt = randomUUID();
    await pool.query(
      `INSERT INTO gamification_consumption_attempts (id,"admissionId",epoch,"claimSequence","claimToken")
      VALUES ($1,$2,0,1,$3)`,
      [attempt, id, token],
    );
    await expect(
      pool.query(
        'UPDATE gamification_consumption_attempts SET "claimToken"=$2 WHERE id=$1',
        [attempt, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await pool.query(
      `UPDATE gamification_consumption_attempts SET state='CONTINUED',"finishedAt"=clock_timestamp() WHERE id=$1`,
      [attempt],
    );
    await expect(
      pool.query(
        `UPDATE gamification_consumption_attempts SET state='COMPLETE' WHERE id=$1`,
        [attempt],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('rejects non-object progress and unknown owners without storing them', async () => {
    const { id } = await seal();
    await expect(
      pool.query(
        `INSERT INTO gamification_owner_progress ("admissionId",owner,"codecVersion",coordinates)
      VALUES ($1,'ACHIEVEMENTS',1,'null')`,
        [id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        `INSERT INTO gamification_owner_progress ("admissionId",owner,"codecVersion",coordinates)
      VALUES ($1,'UNKNOWN',1,'{}')`,
        [id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('blocks at the fifth technical failure and cannot reset the epoch budget', async () => {
    const id = await receipt();
    for (let failure = 1; failure <= 5; failure++) {
      await pool.query(
        `UPDATE gamification_consumption_receipts SET state='RUNNING',"availableAt"=NULL,
        "claimSequence"="claimSequence"+1,"claimToken"=$2,"claimedAt"=NOW(),"leaseUntil"=NOW()+interval '60 seconds'
        WHERE "admissionId"=$1`,
        [id, randomUUID()],
      );
      await pool.query(
        `UPDATE gamification_consumption_receipts SET state=$2,"technicalFailures"=$3,
        "blockCode"=$4,"availableAt"=CASE WHEN $3=5 THEN NULL ELSE NOW() END,
        "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE "admissionId"=$1`,
        [
          id,
          failure === 5 ? 'BLOCKED' : 'RETRY_DUE',
          failure,
          failure === 5 ? 'OWNER_FAILURE' : null,
        ],
      );
    }
    expect(
      (
        await pool.query(
          'SELECT state,"technicalFailures" FROM gamification_consumption_receipts WHERE "admissionId"=$1',
          [id],
        )
      ).rows,
    ).toEqual([{ state: 'BLOCKED', technicalFailures: 5 }]);
    await expect(
      pool.query(
        'UPDATE gamification_consumption_receipts SET "technicalFailures"=0 WHERE "admissionId"=$1',
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('keeps rejection history separate, closed-coded and immutable', async () => {
    const eventId = await delivery();
    const id = randomUUID();
    await pool.query(
      `INSERT INTO gamification_admission_rejections
      (id,destination,"eventId","claimToken",cycle,"cycleAttempt",code)
      VALUES ($1,'gamification.v1',$2,$3,0,1,'PRODUCER_EVIDENCE_MISSING')`,
      [id, eventId, randomUUID()],
    );
    await expect(
      pool.query(
        `UPDATE gamification_admission_rejections SET code='CONFIGURATION_REQUIRED' WHERE id=$1`,
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query('DELETE FROM gamification_admission_rejections WHERE id=$1', [
        id,
      ]),
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        `INSERT INTO gamification_admission_rejections
      (id,destination,"eventId","claimToken",cycle,"cycleAttempt",code)
      VALUES ($1,'gamification.v1',$2,$3,0,1,'UNKNOWN')`,
        [randomUUID(), eventId, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    expect(
      (
        await pool.query(
          'SELECT count(*)::integer AS count FROM gamification_publication_failures WHERE "eventId"=$1',
          [eventId],
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
  });

  it('preserves progress identity and denies deletion', async () => {
    const { id } = await seal();
    await pool.query(
      `INSERT INTO gamification_owner_progress ("admissionId",owner,"codecVersion",coordinates)
      VALUES ($1,'ACHIEVEMENTS',1,'{}')`,
      [id],
    );
    await pool.query(
      `UPDATE gamification_owner_progress SET coordinates='{"sequence":"2"}' WHERE "admissionId"=$1`,
      [id],
    );
    await expect(
      pool.query(
        'UPDATE gamification_owner_progress SET "codecVersion"=2 WHERE "admissionId"=$1',
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    await expect(
      pool.query(
        'DELETE FROM gamification_owner_progress WHERE "admissionId"=$1',
        [id],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
  });
});
