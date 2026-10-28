/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Routing Verification
 * 📄 File: apps/api/test/gamification-routing-persistence.e2e-spec.ts
 * 🎯 Purpose: Exercises real migrated routing repositories under controlled failures and locks.
 * 🧠 Responsibilities: Proves admission, rollback, discovery and stale-attempt fencing.
 * 🏗️ Architecture: Owned disposable schemas; no queue or automatic awards.
 * ⚠️ Important: Publication receipts are not producer-to-consumer delivery evidence.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { PrismaRoutingControlRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository';
import { PrismaRoutingDiscoveryRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-discovery.repository';
import { PrismaRoutingPublicationRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-publication.repository';
import type {
  PublicationClaim,
  RoutingOperator,
} from '../src/composition/gamification-delivery/contracts/routing.types';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const destination = 'gamification.v1';
const operator: RoutingOperator = {
  actorId: 'synthetic:routing-test',
  actorType: 'SERVICE',
};
describe('Gamification routing persistence (explicit fixture commands)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let pool: Pool;
  let audit: AuditWriterService;
  let control: PrismaRoutingControlRepository;
  let discovery: PrismaRoutingDiscoveryRepository;
  let publication: PrismaRoutingPublicationRepository;
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    audit = new AuditWriterService(new AuditRedactionService());
    control = new PrismaRoutingControlRepository(fixture.prisma, audit);
    discovery = new PrismaRoutingDiscoveryRepository(fixture.prisma);
    publication = new PrismaRoutingPublicationRepository(fixture.prisma);
  }, 60000);
  afterEach(async () => {
    jest.restoreAllMocks();
    try {
      await pool?.end();
    } finally {
      await fixture?.close();
    }
  });
  async function activate(): Promise<Date> {
    await control.prepare(operator);
    const result = await control.activate(
      operator,
      0n,
      'synthetic:reviewed-preflight',
    );
    if (!result.cutoff) throw new Error('Expected fixture cutoff');
    return result.cutoff;
  }
  async function source(at: Date, id: string = randomUUID()): Promise<string> {
    await fixture.prisma.outboxEvent.create({
      data: {
        id,
        eventName: 'synthetic.routing.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        producer: 'synthetic',
        payload: { privateSyntheticContent: 'must not enter routing receipts' },
        occurredAt: at,
        createdAt: at,
        status: 'PUBLISHED',
      },
    });
    return id;
  }
  async function ready(count = 1): Promise<string[]> {
    const cutoff = await activate();
    const ids: string[] = [];
    for (let index = 0; index < count; index++)
      ids.push(await source(new Date(cutoff.getTime() + index)));
    await discovery.forward();
    return ids;
  }
  async function due(): Promise<void> {
    await fixture.prisma
      .$executeRaw`UPDATE gamification_deliveries SET "availableAt"=timezone('UTC',clock_timestamp())-interval '1 second' WHERE state='WAITING'`;
  }
  async function expire(): Promise<void> {
    await fixture.prisma.$executeRaw`UPDATE gamification_deliveries SET
      "claimedAt"=timezone('UTC',clock_timestamp())-interval '120 seconds',
      "leaseUntil"=timezone('UTC',clock_timestamp())-interval '60 seconds' WHERE state='CLAIMED'`;
  }
  async function row(eventId: string) {
    return fixture.prisma.gamificationDelivery.findUniqueOrThrow({
      where: { destination_eventId: { destination, eventId } },
    });
  }
  async function rejectInsert(
    table: 'gamification_deliveries' | 'gamification_publication_failures',
  ): Promise<void> {
    await pool.query(
      `CREATE FUNCTION reject_routing_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic routing rejection'; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER synthetic_rejection BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION reject_routing_fixture()`,
    );
  }
  async function unblockInsert(
    table: 'gamification_deliveries' | 'gamification_publication_failures',
  ): Promise<void> {
    await pool.query(`DROP TRIGGER synthetic_rejection ON ${table}`);
  }
  async function blockedBy(pid: number): Promise<number> {
    const deadline = Date.now() + 2000;
    do {
      const result = await pool.query<{ pid: number }>(
        'SELECT pid FROM pg_stat_activity WHERE $1::int=ANY(pg_blocking_pids(pid))',
        [pid],
      );
      if (result.rows[0]) return result.rows[0].pid;
    } while (Date.now() < deadline);
    throw new Error('Expected observed PostgreSQL lock barrier');
  }

  it('has no migration activation and rejects work until explicitly activated', async () => {
    expect(await fixture.prisma.gamificationActivation.count()).toBe(0);
    expect(await discovery.forward()).toEqual({
      status: 'NOT_READY',
      examined: 0,
      inserted: 0,
      epochClosed: false,
    });
    expect(await publication.claim()).toEqual([]);
    expect(await publication.recover()).toBe(0);
    expect(await control.prepare(operator)).toEqual({
      state: 'PREPARED',
      cutoff: null,
      revision: 0n,
    });
    await control.prepare({ ...operator, actorId: 'synthetic:second-prepare' });
    expect(
      await fixture.prisma.gamificationActivation.findUnique({
        where: { destination },
      }),
    ).toMatchObject({ changedBy: operator.actorId, revision: 0n });
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'gamification.activation.prepared' },
      }),
    ).toBe(1);
    expect(await discovery.reconcile()).toMatchObject({ status: 'NOT_READY' });
    await expect(control.setPaused(true, operator, 0n)).rejects.toThrow(
      'NOT_READY',
    );
  });
  it('serializes concurrent activation and preserves cutoff across pause, resume and stale operators', async () => {
    await control.prepare(operator);
    const results = await Promise.allSettled([
      control.activate(operator, 0n, 'synthetic:preflight-a'),
      control.activate(operator, 0n, 'synthetic:preflight-b'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const activation =
      await fixture.prisma.gamificationActivation.findUniqueOrThrow({
        where: { destination },
      });
    expect(activation.revision).toBe(1n);
    await expect(control.setPaused(true, operator, 0n)).rejects.toThrow(
      'STALE_REVISION',
    );
    expect(await control.setPaused(true, operator, 1n)).toEqual({
      state: 'PAUSED',
      cutoff: activation.cutoff,
      revision: 2n,
    });
    expect(await control.setPaused(true, operator, 2n)).toMatchObject({
      revision: 2n,
    });
    expect(await control.setPaused(false, operator, 2n)).toEqual({
      state: 'ACTIVE',
      cutoff: activation.cutoff,
      revision: 3n,
    });
    await expect(
      control.activate(operator, 3n, 'synthetic:again'),
    ).rejects.toThrow('ALREADY_ACTIVATED');
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'gamification.activation.activated' },
      }),
    ).toBe(1);
  });
  it('uses database defaults for preparation timestamps rather than an ORM-supplied clock', async () => {
    // Controlled defaults in this owned fixture make the clock source observable without fake timers.
    await pool.query(
      `ALTER TABLE gamification_activations ALTER COLUMN "updatedAt" SET DEFAULT timestamp '2001-01-01 00:00:00'`,
    );
    await pool.query(
      `ALTER TABLE gamification_discovery ALTER COLUMN "updatedAt" SET DEFAULT timestamp '2002-01-01 00:00:00'`,
    );
    await control.prepare(operator);
    expect(
      await fixture.prisma.gamificationActivation.findUnique({
        where: { destination },
      }),
    ).toMatchObject({ updatedAt: new Date('2001-01-01T00:00:00.000Z') });
    expect(
      await fixture.prisma.gamificationDiscovery.findUnique({
        where: { destination },
      }),
    ).toMatchObject({ updatedAt: new Date('2002-01-01T00:00:00.000Z') });
  });
  it('rolls activation back if the atomic audit fails and retains unknown error identity', async () => {
    const failure = new Error('synthetic audit unavailable');
    const append = jest.spyOn(audit, 'append').mockRejectedValueOnce(failure);
    await expect(control.prepare(operator)).rejects.toBe(failure);
    expect(await fixture.prisma.gamificationActivation.count()).toBe(0);
    expect(await fixture.prisma.gamificationDiscovery.count()).toBe(0);
    await control.prepare(operator);
    append.mockRejectedValueOnce(failure);
    await expect(
      control.activate(operator, 0n, 'synthetic:preflight'),
    ).rejects.toBe(failure);
    expect(
      await fixture.prisma.gamificationActivation.findUnique({
        where: { destination },
      }),
    ).toMatchObject({ state: 'PREPARED', cutoff: null, revision: 0n });
    expect(
      await control.activate(operator, 0n, 'synthetic:preflight'),
    ).toMatchObject({ state: 'ACTIVE', revision: 1n });
  });
  it('enforces boundary/history/claim structural guards in the migrated database', async () => {
    const [id] = await ready();
    await expect(
      fixture.prisma.gamificationActivation.update({
        where: { destination },
        data: { cutoff: new Date(0) },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.gamificationActivation.update({
        where: { destination },
        data: { activatedBy: 'synthetic:replacement' },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.gamificationActivation.delete({ where: { destination } }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.gamificationDiscovery.update({
        where: { destination },
        data: { forwardId: null },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.gamificationDelivery.updateMany({
        data: { state: 'CLAIMED' },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.outboxEvent.delete({ where: { id } }),
    ).rejects.toThrow();
    const [claim] = await publication.claim();
    await publication.fail(claim);
    await expect(
      fixture.prisma.gamificationPublicationFailure.updateMany({
        data: { code: 'CLAIM_EXPIRED' },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.gamificationPublicationFailure.deleteMany(),
    ).rejects.toThrow();
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(1);
  });
  it('discovers inclusive equality/zero UUID, ignores old coordinates and preserves legacy state', async () => {
    const cutoff = await activate();
    await source(new Date(cutoff.getTime() - 1));
    const id = await source(cutoff, '00000000-0000-0000-0000-000000000000');
    expect(await discovery.forward(1)).toMatchObject({
      examined: 1,
      inserted: 1,
    });
    expect(await discovery.forward(1)).toMatchObject({
      examined: 0,
      inserted: 0,
    });
    expect(await fixture.prisma.gamificationDelivery.count()).toBe(1);
    expect((await row(id)).state).toBe('WAITING');
    expect(
      await fixture.prisma.outboxEvent.findUnique({ where: { id } }),
    ).toMatchObject({
      status: 'PUBLISHED',
      payload: { privateSyntheticContent: 'must not enter routing receipts' },
    });
    expect(await fixture.prisma.processedEvent.count()).toBe(0);
    expect(await fixture.prisma.deadLetterEvent.count()).toBe(0);
    expect(await fixture.prisma.communityPointEntry.count()).toBe(0);
  });
  it('rolls back inserted references and cursor advancement together', async () => {
    const cutoff = await activate();
    await source(cutoff);
    await rejectInsert('gamification_deliveries');
    await expect(discovery.forward()).rejects.toThrow();
    expect(await fixture.prisma.gamificationDelivery.count()).toBe(0);
    expect(
      await fixture.prisma.gamificationDiscovery.findUnique({
        where: { destination },
      }),
    ).toMatchObject({ forwardAt: null, examined: 0n });
    await unblockInsert('gamification_deliveries');
    expect(await discovery.forward()).toMatchObject({
      examined: 1,
      inserted: 1,
    });
  });
  it('serializes materializers, advances over existing references and never resets a queued claim', async () => {
    await ready(3);
    const [claim] = await publication.claim(1);
    await publication.acknowledge(claim);
    const [first, second] = await Promise.all([
      discovery.reconcile(1),
      discovery.reconcile(1),
    ]);
    expect(first.examined + second.examined).toBe(2);
    expect(first.inserted + second.inserted).toBe(0);
    expect(await fixture.prisma.gamificationDelivery.count()).toBe(3);
    expect((await row(claim.eventId)).state).toBe('QUEUED');
    expect(await discovery.reconcile(1)).toMatchObject({
      examined: 1,
      inserted: 0,
      epochClosed: true,
    });
  });
  it('finishes empty/fixed epochs and catches a real late prefix commit on the next sweep', async () => {
    const cutoff = await activate();
    expect(await discovery.reconcile()).toMatchObject({
      examined: 0,
      epochClosed: true,
    });
    const client = await pool.connect();
    let pending = false;
    try {
      await client.query('BEGIN');
      pending = true;
      const lateId = randomUUID();
      await client.query(
        `INSERT INTO outbox_events (id,"eventName","eventVersion","eventCategory",producer,payload,"occurredAt","createdAt","updatedAt")
        VALUES ($1,'synthetic.late.v1',1,'integration','synthetic','{}',$2::timestamp,$2::timestamp,$2::timestamp)`,
        [lateId, new Date(cutoff.getTime() + 1).toISOString()],
      );
      const first = await source(new Date(cutoff.getTime() + 2));
      const upper = await source(new Date(cutoff.getTime() + 3));
      expect(await discovery.forward()).toMatchObject({ inserted: 2 });
      expect(await discovery.reconcile(1)).toMatchObject({
        examined: 1,
        epochClosed: false,
      });
      await source(new Date(cutoff.getTime() + 4));
      await client.query('COMMIT');
      pending = false;
      expect(await discovery.reconcile(1)).toMatchObject({
        examined: 1,
        inserted: 0,
        epochClosed: true,
      });
      expect(
        await fixture.prisma.gamificationDelivery.findMany({
          select: { eventId: true },
          orderBy: { eventId: 'asc' },
        }),
      ).toEqual([first, upper].sort().map((eventId) => ({ eventId })));
      expect(await discovery.forward()).toMatchObject({ inserted: 1 });
      expect(await discovery.reconcile()).toMatchObject({
        examined: 4,
        inserted: 1,
        epochClosed: true,
      });
      expect((await row(lateId)).state).toBe('WAITING');
    } finally {
      try {
        if (pending) await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
  });
  it('claims disjoint bounded references without exposing payloads and acknowledges only current ownership', async () => {
    await ready(3);
    const [left, right] = await Promise.all([
      publication.claim(2),
      publication.claim(2),
    ]);
    const claims = [...left, ...right];
    expect(claims).toHaveLength(3);
    expect(new Set(claims.map(({ eventId }) => eventId)).size).toBe(3);
    expect(Object.keys(claims[0]).sort()).toEqual([
      'claimToken',
      'cycle',
      'cycleAttempt',
      'eventId',
    ]);
    expect(Object.isFrozen(claims[0])).toBe(true);
    expect(await publication.acknowledge(claims[0])).toBe(true);
    expect(await publication.acknowledge(claims[0])).toBe(false);
    expect(await publication.fail(claims[0])).toBe(false);
    expect((await row(claims[0].eventId)).state).toBe('QUEUED');
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(0);
  });
  it('skips a row held by another materializer rather than losing the other due references', async () => {
    const ids = await ready(2);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT 1 FROM gamification_deliveries WHERE "eventId"=$1 FOR UPDATE',
        [ids[0]],
      );
      const claims = await publication.claim(2);
      expect(claims.map(({ eventId }) => eventId)).toEqual([ids[1]]);
    } finally {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
    expect((await publication.claim(2)).map(({ eventId }) => eventId)).toEqual([
      ids[0],
    ]);
  });
  it('records exact backoff and blocks on the fifth attempt without changing lifetime count', async () => {
    const [id] = await ready();
    for (let attempt = 1; attempt <= 5; attempt++) {
      await due();
      const [claim] = await publication.claim();
      expect(claim).toMatchObject({ cycle: 0, cycleAttempt: attempt });
      expect(await publication.fail(claim)).toBe(true);
      const delivery = await row(id);
      expect(delivery.claimCount).toBe(BigInt(attempt));
      expect(delivery.state).toBe(attempt === 5 ? 'BLOCKED' : 'WAITING');
      const expectedDelay = attempt === 5 ? 0 : 2 ** (attempt - 1);
      expect(
        (delivery.availableAt.getTime() - delivery.updatedAt.getTime()) / 1000,
      ).toBe(expectedDelay);
    }
    expect(await publication.claim()).toEqual([]);
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(5);
  });
  it('rolls a failure transition back when failure history cannot be appended', async () => {
    const [id] = await ready();
    const [claim] = await publication.claim();
    await rejectInsert('gamification_publication_failures');
    await expect(publication.fail(claim)).rejects.toThrow();
    expect(await row(id)).toMatchObject({
      state: 'CLAIMED',
      claimToken: claim.claimToken,
    });
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(0);
    await unblockInsert('gamification_publication_failures');
    expect(await publication.fail(claim)).toBe(true);
  });
  it('recovers expired ownership while paused and rejects stale success/failure without double counting', async () => {
    const [id] = await ready();
    const [old] = await publication.claim();
    await expire();
    await control.setPaused(true, operator, 1n);
    expect(await publication.claim()).toEqual([]);
    expect(await publication.recover()).toBe(1);
    expect(await publication.recover()).toBe(0);
    expect(await publication.acknowledge(old)).toBe(false);
    expect(await publication.fail(old)).toBe(false);
    expect(await row(id)).toMatchObject({
      state: 'WAITING',
      claimCount: 1n,
      cycleAttempts: 1,
    });
    expect(
      await fixture.prisma.gamificationPublicationFailure.findMany({
        select: { code: true },
      }),
    ).toEqual([{ code: 'CLAIM_EXPIRED' }]);
    await control.setPaused(false, operator, 2n);
    await due();
    const [current] = await publication.claim();
    expect(current.claimToken).not.toBe(old.claimToken);
    expect(await publication.acknowledge(old)).toBe(false);
    expect(
      await publication.acknowledge({ ...current, claimToken: old.claimToken }),
    ).toBe(false);
    expect(
      await publication.fail({ ...current, claimToken: old.claimToken }),
    ).toBe(false);
    expect(await publication.acknowledge(current)).toBe(true);
  });
  it('fences recovery versus acknowledgement and does not mistake expiry alone for ownership loss', async () => {
    await ready();
    const [claim] = await publication.claim();
    await expire();
    expect(await publication.acknowledge(claim)).toBe(true);
    expect(await publication.recover()).toBe(0);
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(0);
  });
  it('records exactly one failure when two current-attempt failures race', async () => {
    await ready();
    const [claim] = await publication.claim();
    const results = await Promise.all([
      publication.fail(claim),
      publication.fail(claim),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(1);
  });
  it('blocks an expired fifth claim without adding a sixth attempt during recovery', async () => {
    const [id] = await ready();
    for (let attempt = 1; attempt < 5; attempt++) {
      await due();
      const [claim] = await publication.claim();
      await publication.fail(claim);
    }
    await due();
    await publication.claim();
    await expire();
    expect(await publication.recover()).toBe(1);
    expect(await row(id)).toMatchObject({
      state: 'BLOCKED',
      claimCount: 5n,
      cycleAttempts: 5,
    });
    expect(await publication.claim()).toEqual([]);
    expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(5);
  });
  it('rejects an acknowledgement actually blocked behind a winning recovery transaction', async () => {
    const [id] = await ready();
    const [claim] = await publication.claim();
    await expire();
    const holder = await pool.connect();
    const key = 907232;
    let recovery: Promise<number> | undefined;
    let acknowledgement: Promise<boolean> | undefined;
    try {
      const result = await holder.query<{ pid: number }>(
        'SELECT pg_backend_pid() AS pid',
      );
      await holder.query('SELECT pg_advisory_lock($1)', [key]);
      await pool.query(`CREATE FUNCTION routing_recovery_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        PERFORM pg_advisory_xact_lock(${key}); RETURN NEW; END $$`);
      await pool.query(
        'CREATE TRIGGER routing_recovery_barrier BEFORE INSERT ON gamification_publication_failures FOR EACH ROW EXECUTE FUNCTION routing_recovery_barrier()',
      );
      recovery = publication.recover();
      const recoveryPid = await blockedBy(result.rows[0].pid);
      acknowledgement = publication.acknowledge(claim);
      await blockedBy(recoveryPid);
      await holder.query('SELECT pg_advisory_unlock($1)', [key]);
      expect(await recovery).toBe(1);
      expect(await acknowledgement).toBe(false);
      expect(await row(id)).toMatchObject({ state: 'WAITING', claimCount: 1n });
      expect(await fixture.prisma.gamificationPublicationFailure.count()).toBe(
        1,
      );
    } finally {
      await holder.query('SELECT pg_advisory_unlock($1)', [key]);
      holder.release();
      await Promise.allSettled([recovery, acknowledgement]);
    }
  });
  it('linearizes an actual claim before pause and permits its already admitted acknowledgement', async () => {
    await ready(2);
    const holder: PoolClient = await pool.connect();
    let claimPromise: Promise<readonly PublicationClaim[]> | undefined;
    let pausePromise: ReturnType<typeof control.setPaused> | undefined;
    const key = 907231;
    try {
      const pidResult = await holder.query<{ pid: number }>(
        'SELECT pg_backend_pid() AS pid',
      );
      await holder.query('SELECT pg_advisory_lock($1)', [key]);
      await pool.query(`CREATE FUNCTION routing_claim_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.state='CLAIMED' THEN PERFORM pg_advisory_xact_lock(${key}); END IF; RETURN NEW; END $$`);
      await pool.query(
        'CREATE TRIGGER routing_claim_barrier BEFORE UPDATE ON gamification_deliveries FOR EACH ROW EXECUTE FUNCTION routing_claim_barrier()',
      );
      claimPromise = publication.claim(1);
      const claimPid = await blockedBy(pidResult.rows[0].pid);
      pausePromise = control.setPaused(true, operator, 1n);
      await blockedBy(claimPid);
      await holder.query('SELECT pg_advisory_unlock($1)', [key]);
      const claims = await claimPromise;
      expect(claims).toHaveLength(1);
      expect(await pausePromise).toMatchObject({ state: 'PAUSED' });
      expect(await publication.claim()).toEqual([]);
      expect(await publication.acknowledge(claims[0])).toBe(true);
      const activation =
        await fixture.prisma.gamificationActivation.findUniqueOrThrow({
          where: { destination },
        });
      if (!activation.cutoff) throw new Error('Expected established cutoff');
      await source(new Date(activation.cutoff.getTime() + 2));
      expect(await discovery.reconcile()).toMatchObject({
        status: 'SCANNED',
        examined: 3,
        inserted: 1,
      });
    } finally {
      await holder.query('SELECT pg_advisory_unlock($1)', [key]);
      holder.release();
      await Promise.allSettled([claimPromise, pausePromise]);
    }
  });
  it('rejects invalid command bounds before changing persistent state', async () => {
    await expect(control.prepare({ ...operator, actorId: '' })).rejects.toThrow(
      TypeError,
    );
    await expect(control.activate(operator, -1n, 'synthetic')).rejects.toThrow(
      TypeError,
    );
    for (const limit of [0, -1, 1.5, 257])
      expect(() => discovery.forward(limit)).toThrow(TypeError);
    for (const limit of [0, 33, NaN])
      await expect(publication.claim(limit)).rejects.toThrow(TypeError);
    await expect(
      publication.acknowledge({
        eventId: 'bad',
        claimToken: 'bad',
        cycle: 0,
        cycleAttempt: 1,
      }),
    ).rejects.toThrow(TypeError);
    expect(await fixture.prisma.gamificationActivation.count()).toBe(0);
  });
});
