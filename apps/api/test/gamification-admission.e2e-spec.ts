/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Admission Integration Verification
 * 📄 File: apps/api/test/gamification-admission.e2e-spec.ts
 * 🎯 Purpose: Proves real producer sealing, rollback and exact publication-claim fencing.
 * 🧠 Responsibilities: Exercises isolated migrated storage without queue or owner effects.
 * 🏗️ Architecture: Real producer/root adapters; no Auth mocks or automatic activation.
 * ⚠️ Important: Fixture activation is private to this disposable schema.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaService } from '@api/core/database';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { CanonicalOutboxReader } from '@api/core/events/infrastructure';
import { AppModule } from '../src/app.module';
import {
  REPUTATION_REPOSITORY,
  type ReputationRepository,
} from '../src/modules/reputation/domain/repositories/reputation.repository.interface';
import { ReputationQualificationAdapter } from '../src/composition/reputation/infrastructure/reputation-qualification.adapter';
import { PrismaAdmissionRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-admission.repository';
import { PrismaRoutingControlRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository';
import { PrismaRoutingDiscoveryRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-discovery.repository';
import { PrismaRoutingPublicationRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-publication.repository';
import type { PublicationClaim } from '../src/composition/gamification-delivery/contracts/routing.types';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Inactive gamification admission (real producer)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let pool: Pool;
  let reputation: ReputationRepository;
  let producer: ReputationQualificationAdapter;
  let admission: PrismaAdmissionRepository;
  let discovery: PrismaRoutingDiscoveryRepository;
  let publication: PrismaRoutingPublicationRepository;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    reputation = app.get(REPUTATION_REPOSITORY);
    producer = app.get(ReputationQualificationAdapter);
    admission = new PrismaAdmissionRepository(
      fixture.prisma,
      producer,
      new CanonicalOutboxReader(),
    );
    discovery = new PrismaRoutingDiscoveryRepository(fixture.prisma);
    publication = new PrismaRoutingPublicationRepository(fixture.prisma);
    const control = new PrismaRoutingControlRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
    );
    const operator = {
      actorId: 'synthetic:c21-admission',
      actorType: 'SERVICE' as const,
    };
    await control.prepare(operator);
    await control.activate(operator, 0n, 'synthetic:private-admission-proof');
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await pool?.end();
      } finally {
        await fixture?.close();
      }
    }
  });

  async function subject() {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        username: id,
        email: `${id}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    return id;
  }
  async function source() {
    const actorId = await subject(),
      recipientId = await subject();
    const entry = await reputation.createDirect({
      actorId,
      recipientId,
      value: 1,
      reason: 'Synthetic reason must not enter seal',
      cooldownStartedAfter: new Date(Date.now() - 86400000),
    });
    if (!entry) throw new Error('Expected synthetic direct entry.');
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: { producer: 'dss.api.reputation', aggregateId: entry.id },
    });
    return { entry, eventId: event.id, actorId, recipientId };
  }
  async function claimed(eventId: string): Promise<PublicationClaim> {
    await discovery.forward();
    const claim = (await publication.claim()).find(
      (value) => value.eventId === eventId,
    );
    if (!claim) throw new Error('Expected exact fixture publication claim.');
    return claim;
  }
  function deliveryKey(eventId: string) {
    return { destination_eventId: { destination: 'gamification.v1', eventId } };
  }

  it('creates one seal/receipt atomically and invokes no owner effects', async () => {
    const s = await source();
    const result = await admission.prepare(await claimed(s.eventId));
    expect(result.status).toBe('CREATED');
    if (result.status !== 'CREATED') throw new Error('Expected created seal.');
    const row = await fixture.prisma.gamificationAdmission.findUniqueOrThrow({
      where: { id: result.admission.admissionId },
      include: { receipt: true },
    });
    expect(row.receipt).toMatchObject({
      state: 'READY',
      pointsDone: true,
      levelsDone: true,
      achievementsDone: false,
      technicalFailures: 0,
    });
    expect(JSON.stringify(row.projection)).not.toContain('Synthetic reason');
    expect(await fixture.prisma.achievementAward.count()).toBe(0);
    expect(await fixture.prisma.communityPointEntry.count()).toBe(0);
  });

  it('reuses an existing seal after withdrawal without recomputing its producer view', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    const created = await admission.prepare(claim);
    if (created.status !== 'CREATED') throw new Error('Expected created seal.');
    const before = await fixture.prisma.gamificationAdmission.findUniqueOrThrow(
      { where: { id: created.admission.admissionId } },
    );
    await reputation.reverse(
      s.entry.id,
      await subject(),
      s.recipientId,
      -1,
      'Synthetic withdrawal',
    );
    const prepare = jest
      .spyOn(producer, 'prepareInTransaction')
      .mockRejectedValue(new Error('Must not recompute an existing seal.'));
    expect(await admission.prepare(claim)).toEqual({
      status: 'REUSED',
      admission: created.admission,
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(
      await fixture.prisma.gamificationAdmission.findUniqueOrThrow({
        where: { id: before.id },
      }),
    ).toEqual(before);
  });

  it('rejects stale tokens and cycles without seal or rejection writes', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    expect(
      await admission.prepare({ ...claim, claimToken: randomUUID() }),
    ).toEqual({ status: 'STALE_CLAIM' });
    expect(
      await admission.prepare({ ...claim, cycle: claim.cycle + 1 }),
    ).toEqual({ status: 'STALE_CLAIM' });
    expect(
      await fixture.prisma.gamificationAdmission.count({
        where: { eventId: s.eventId },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.gamificationAdmissionRejection.count({
        where: { eventId: s.eventId },
      }),
    ).toBe(0);
  });

  it('does not reopen a seal after the publication claim was acknowledged', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    await admission.prepare(claim);
    expect(await publication.acknowledge(claim)).toBe(true);
    expect(await admission.prepare(claim)).toEqual({ status: 'STALE_CLAIM' });
    expect(
      await fixture.prisma.gamificationAdmission.count({
        where: { eventId: s.eventId },
      }),
    ).toBe(1);
  });

  it('records first-attempt admission rejection independently of queue failures', async () => {
    const event = await fixture.prisma.outboxEvent.create({
      data: {
        eventName: 'synthetic.unsupported.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        producer: 'synthetic',
        payload: {},
        occurredAt: new Date(),
      },
    });
    const claim = await claimed(event.id);
    expect(await admission.prepare(claim)).toEqual({
      status: 'REJECTED',
      code: 'UNSUPPORTED_DESCRIPTOR',
    });
    expect(
      await fixture.prisma.gamificationDelivery.findUniqueOrThrow({
        where: deliveryKey(event.id),
      }),
    ).toMatchObject({ state: 'BLOCKED', cycleAttempts: 1, claimToken: null });
    expect(
      await fixture.prisma.gamificationAdmissionRejection.findUniqueOrThrow({
        where: { claimToken: claim.claimToken },
      }),
    ).toMatchObject({
      eventId: event.id,
      code: 'UNSUPPORTED_DESCRIPTOR',
      cycleAttempt: 1,
    });
    expect(
      await fixture.prisma.gamificationPublicationFailure.count({
        where: { eventId: event.id },
      }),
    ).toBe(0);
  });

  it('forbids early BLOCKED without exact rejection evidence', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    await expect(
      pool.query(
        `UPDATE gamification_deliveries SET state='BLOCKED',"claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL
      WHERE destination='gamification.v1' AND "eventId"=$1`,
        [s.eventId],
      ),
    ).rejects.toMatchObject({ code: 'P0001' });
    expect(
      await fixture.prisma.gamificationDelivery.findUniqueOrThrow({
        where: deliveryKey(s.eventId),
      }),
    ).toMatchObject({ state: 'CLAIMED', claimToken: claim.claimToken });
  });

  it('rolls back admission insertion if initial receipt insertion fails', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    await pool.query(
      `CREATE FUNCTION synthetic_c21_receipt_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic C2.1 receipt failure'; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER synthetic_c21_receipt_failure BEFORE INSERT ON gamification_consumption_receipts FOR EACH ROW EXECUTE FUNCTION synthetic_c21_receipt_failure()`,
    );
    try {
      await expect(admission.prepare(claim)).rejects.toThrow(
        'synthetic C2.1 receipt failure',
      );
      expect(
        await fixture.prisma.gamificationAdmission.count({
          where: { eventId: s.eventId },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.gamificationConsumptionReceipt.count({
          where: { admission: { eventId: s.eventId } },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.gamificationDelivery.findUniqueOrThrow({
          where: deliveryKey(s.eventId),
        }),
      ).toMatchObject({ state: 'CLAIMED', claimToken: claim.claimToken });
    } finally {
      await pool.query(
        'DROP TRIGGER synthetic_c21_receipt_failure ON gamification_consumption_receipts',
      );
      await pool.query('DROP FUNCTION synthetic_c21_receipt_failure()');
    }
    expect((await admission.prepare(claim)).status).toBe('CREATED');
  });

  it('keeps an unknown preparation failure intact without fabricating rejection', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    const failure = new Error('Synthetic source unavailable.');
    jest.spyOn(producer, 'prepareInTransaction').mockRejectedValueOnce(failure);
    await expect(admission.prepare(claim)).rejects.toBe(failure);
    expect(
      await fixture.prisma.gamificationAdmissionRejection.count({
        where: { eventId: s.eventId },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.gamificationDelivery.findUniqueOrThrow({
        where: deliveryKey(s.eventId),
      }),
    ).toMatchObject({ state: 'CLAIMED', claimToken: claim.claimToken });
  });

  it('accepts an expired timestamp while the publication claim has not been recovered', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    await pool.query(
      `UPDATE gamification_deliveries SET "claimedAt"=NOW()-interval '120 seconds',"leaseUntil"=NOW()-interval '60 seconds' WHERE "eventId"=$1`,
      [s.eventId],
    );
    expect((await admission.prepare(claim)).status).toBe('CREATED');
    expect(await publication.acknowledge(claim)).toBe(true);
  });

  it('fences an old claim after recovery allocated a replacement', async () => {
    const s = await source();
    const old = await claimed(s.eventId);
    await pool.query(
      `UPDATE gamification_deliveries SET "claimedAt"=NOW()-interval '120 seconds',"leaseUntil"=NOW()-interval '60 seconds' WHERE "eventId"=$1`,
      [s.eventId],
    );
    await publication.recover();
    await pool.query(
      `UPDATE gamification_deliveries SET "availableAt"=NOW() WHERE "eventId"=$1`,
      [s.eventId],
    );
    const current = await claimed(s.eventId);
    expect(current.claimToken).not.toBe(old.claimToken);
    expect(current.cycleAttempt).toBe(old.cycleAttempt + 1);
    expect(await admission.prepare(old)).toEqual({ status: 'STALE_CLAIM' });
    expect(await admission.rejectAdmission(old, 'CONFIGURATION_REQUIRED')).toBe(
      'STALE',
    );
    expect((await admission.prepare(current)).status).toBe('CREATED');
    expect(
      await fixture.prisma.gamificationAdmissionRejection.count({
        where: { eventId: s.eventId },
      }),
    ).toBe(0);
  });

  it('holds the delivery row while preparing so recovery skips that exact claim', async () => {
    const s = await source();
    const claim = await claimed(s.eventId);
    await pool.query(
      `UPDATE gamification_deliveries SET "claimedAt"=NOW()-interval '120 seconds',"leaseUntil"=NOW()-interval '60 seconds' WHERE "eventId"=$1`,
      [s.eventId],
    );
    let entered!: () => void, release!: () => void;
    const observed = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const actual = producer.prepareInTransaction.bind(
      producer,
    ) as ReputationQualificationAdapter['prepareInTransaction'];
    jest
      .spyOn(producer, 'prepareInTransaction')
      .mockImplementationOnce(async (...args) => {
        entered();
        await gate;
        return actual(...args);
      });
    const pending = admission.prepare(claim);
    let result: Awaited<typeof pending> | undefined;
    try {
      await observed;
      await publication.recover();
      expect(
        await fixture.prisma.gamificationDelivery.findUniqueOrThrow({
          where: deliveryKey(s.eventId),
        }),
      ).toMatchObject({ state: 'CLAIMED', claimToken: claim.claimToken });
    } finally {
      release();
      result = await pending;
    }
    expect(result?.status).toBe('CREATED');
  });

  it.each(['token', 'cycle', 'attempt'] as const)(
    'rejects mismatched rejection %s at commit and rolls back both writes',
    async (changed) => {
      const s = await source();
      const claim = await claimed(s.eventId);
      const rejectedCycle = claim.cycle + (changed === 'cycle' ? 1 : 0);
      const rejectedAttempt =
        claim.cycleAttempt + (changed === 'attempt' ? 1 : 0);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO gamification_admission_rejections
        (id,destination,"eventId","claimToken",cycle,"cycleAttempt",code)
        VALUES ($1,'gamification.v1',$2,$3,$4,$5,'CONFIGURATION_REQUIRED')`,
          [
            randomUUID(),
            s.eventId,
            changed === 'token' ? randomUUID() : claim.claimToken,
            rejectedCycle,
            rejectedAttempt,
          ],
        );
        await client.query(
          `UPDATE gamification_deliveries SET state='BLOCKED',"claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL,
          cycle=$2,"cycleAttempts"=$3,"claimCount"="claimCount"+$4
        WHERE destination='gamification.v1' AND "eventId"=$1`,
          [
            s.eventId,
            rejectedCycle,
            rejectedAttempt,
            changed === 'attempt' ? 1 : 0,
          ],
        );
        await expect(client.query('COMMIT')).rejects.toMatchObject({
          code: 'P0001',
        });
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
      expect(
        await fixture.prisma.gamificationAdmissionRejection.count({
          where: { eventId: s.eventId },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.gamificationDelivery.findUniqueOrThrow({
          where: deliveryKey(s.eventId),
        }),
      ).toMatchObject({ state: 'CLAIMED', claimToken: claim.claimToken });
    },
  );
});
