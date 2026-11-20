/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Consumption CAS Integration Verification
 * 📄 File: apps/api/test/gamification-consumption.e2e-spec.ts
 * 🎯 Purpose: Proves technical claim/settlement/recovery state under real migrated PostgreSQL.
 * 🧠 Responsibilities: Exercises current-token fences, durable progress and independent failure budgets.
 * 🏗️ Architecture: Isolated bookkeeping fixtures; no queue, owner invocation or Auth mocks.
 * ⚠️ Important: Synthetic seals do not certify producer admission or economic effects.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createConsumptionFixture } from './helpers/gamification-consumption.fixture';

describe('Inactive consumption CAS bookkeeping', () => {
  let h: Awaited<ReturnType<typeof createConsumptionFixture>>;
  beforeEach(async () => {
    h = await createConsumptionFixture();
  }, 60000);
  afterEach(async () => {
    await h?.close();
  });

  it('atomically claims ready work and returns a verified seal/done projection', async () => {
    const { id } = await h.add();
    const [claim] = await h.consumption.claim();
    expect(claim).toMatchObject({ admissionId: id, epoch: 0n, sequence: 1n });
    const claimedRow =
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      });
    expect(
      claimedRow.leaseUntil!.getTime() - claimedRow.claimedAt!.getTime(),
    ).toBe(60000);
    expect(await h.consumption.load(claim)).toMatchObject({
      admissionId: id,
      done: { POINTS: true, LEVELS: true, ACHIEVEMENTS: false },
      progress: null,
    });
    expect(
      await h.prisma.gamificationConsumptionAttempt.count({
        where: { admissionId: id, state: 'OPEN', claimToken: claim.token },
      }),
    ).toBe(1);
  });

  it('completes terminal work once and never reopens it for a duplicate hint', async () => {
    await h.add();
    const [claim] = await h.consumption.claim();
    expect(
      await h.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('APPLIED');
    expect(
      await h.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('STALE');
    expect(await h.consumption.load(claim)).toBeNull();
    expect(await h.consumption.claim()).toEqual([]);
    expect(
      await h.prisma.gamificationConsumptionAttempt.findUniqueOrThrow({
        where: { claimToken: claim.token },
      }),
    ).toMatchObject({ state: 'COMPLETE', code: null });
  });

  it('persists more than five valid continuations without charging failures', async () => {
    const { id, scope } = await h.add();
    for (let page = 1; page <= 7; page++) {
      const [claim] = await h.consumption.claim();
      expect(claim.sequence).toBe(BigInt(page));
      expect(
        await h.consumption.continueOwner(claim, {
          owner: 'ACHIEVEMENTS',
          progress: { scope, generation: '1', sequence: String(page) },
        }),
      ).toBe('APPLIED');
    }
    const [final] = await h.consumption.claim();
    expect((await h.consumption.load(final))?.progress).toEqual({
      scope,
      generation: '1',
      sequence: '7',
    });
    expect(
      await h.consumption.completeOwner(final, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('APPLIED');
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({ state: 'COMPLETE', technicalFailures: 0 });
    expect(
      await h.prisma.gamificationConsumptionAttempt.count({
        where: { admissionId: id, state: 'CONTINUED' },
      }),
    ).toBe(7);
  });

  it.each([0, 1, 2, 3, 4])(
    'retains exact technical budget/backoff after %i prior failures',
    async (prior) => {
      const { id } = await h.add(prior);
      const [claim] = await h.consumption.claim();
      expect(await h.consumption.fail(claim, 'OWNER_UNAVAILABLE')).toBe(
        'APPLIED',
      );
      const row =
        await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
          where: { admissionId: id },
        });
      expect(row.technicalFailures).toBe(prior + 1);
      expect(row.state).toBe(prior === 4 ? 'BLOCKED' : 'RETRY_DUE');
      expect(row.pointsDone).toBe(true);
      if (prior === 4) {
        expect(row.availableAt).toBeNull();
        expect(row.blockCode).toBe('OWNER_UNAVAILABLE');
      } else
        expect(row.availableAt!.getTime() - row.updatedAt.getTime()).toBe(
          2 ** prior * 1000,
        );
      expect(await h.consumption.fail(claim, 'OWNER_FAILURE')).toBe('STALE');
    },
  );

  it('fences every old callback after recovery and a controlled replacement claim', async () => {
    const { id, scope } = await h.add();
    const old = await h.fixtureClaim(id, true);
    expect(await h.consumption.recover()).toBe(1);
    // Replacement phase is controlled by valid fixture SQL; backoff is separately asserted.
    const current = await h.fixtureClaim(id);
    expect(await h.consumption.load(old)).toBeNull();
    expect(await h.consumption.fail(old, 'OWNER_FAILURE')).toBe('STALE');
    expect(
      await h.consumption.block(old, {
        owner: 'ACHIEVEMENTS',
        code: 'FACT_CONFLICT',
      }),
    ).toBe('STALE');
    expect(
      await h.consumption.continueOwner(old, {
        owner: 'ACHIEVEMENTS',
        progress: { scope, generation: '1', sequence: '1' },
      }),
    ).toBe('STALE');
    expect(
      await h.consumption.completeOwner(old, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('STALE');
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({
      state: 'RUNNING',
      claimToken: current.token,
      technicalFailures: 1,
      claimSequence: 2n,
    });
    expect(
      await h.prisma.gamificationConsumptionAttempt.findUniqueOrThrow({
        where: { claimToken: old.token },
      }),
    ).toMatchObject({ state: 'EXPIRED', code: 'LEASE_EXPIRED' });
  });

  it('permits in-flight completion during pause but admits no new claims', async () => {
    await h.add();
    const [claim] = await h.consumption.claim();
    await h.add();
    await h.control.setPaused(true, h.operator, 1n);
    expect(await h.consumption.claim()).toEqual([]);
    expect(
      await h.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('APPLIED');
    await h.control.setPaused(false, h.operator, 2n);
    expect(await h.consumption.claim()).toHaveLength(1);
  });

  it('recovers expired bookkeeping while paused without allocating replacement work', async () => {
    const { id } = await h.add();
    await h.fixtureClaim(id, true);
    await h.control.setPaused(true, h.operator, 1n);
    expect(await h.consumption.recover()).toBe(1);
    expect(await h.consumption.claim()).toEqual([]);
  });

  it('keeps policy rejection distinct from technical failures', async () => {
    const { id } = await h.add();
    const [claim] = await h.consumption.claim();
    expect(
      await h.consumption.block(claim, {
        owner: 'ACHIEVEMENTS',
        code: 'BLOCKED_LEGACY_MAPPING',
      }),
    ).toBe('APPLIED');
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({
      state: 'BLOCKED',
      blockCode: 'ACHIEVEMENTS:BLOCKED_LEGACY_MAPPING',
      technicalFailures: 0,
    });
    expect(
      await h.prisma.gamificationConsumptionAttempt.findUniqueOrThrow({
        where: { claimToken: claim.token },
      }),
    ).toMatchObject({
      state: 'BLOCKED',
      code: 'ACHIEVEMENTS:BLOCKED_LEGACY_MAPPING',
    });
  });

  it('skips a locked due head and claims other eligible work', async () => {
    const first = await h.add(),
      second = await h.add();
    const client = await h.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT "admissionId" FROM gamification_consumption_receipts WHERE "admissionId"=$1 FOR UPDATE',
        [first.id],
      );
      const claims = await h.consumption.claim(1);
      expect(claims.map((row) => row.admissionId)).toEqual([second.id]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('chooses the oldest eligible receipt across READY and RETRY_DUE lanes', async () => {
    const ready = await h.add();
    const [initial] = await h.consumption.claim();
    await h.consumption.continueOwner(initial, {
      owner: 'ACHIEVEMENTS',
      progress: { scope: ready.scope, generation: '1', sequence: '1' },
    });
    const retry = await h.add(1);
    const [selected] = await h.consumption.claim(1);
    expect(selected.admissionId).toBe(retry.id);
  });

  it('rejects foreign progress and leaves the current claim untouched', async () => {
    const { id, scope } = await h.add();
    const [claim] = await h.consumption.claim();
    await expect(
      h.consumption.continueOwner(claim, {
        owner: 'ACHIEVEMENTS',
        progress: {
          scope: { ...scope, sourceId: 'foreign' },
          generation: '1',
          sequence: '1',
        },
      }),
    ).rejects.toThrow('absent from admission');
    expect(await h.prisma.gamificationOwnerProgress.count()).toBe(0);
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({ state: 'RUNNING', claimToken: claim.token });
  });

  it('does not invalidate a current token merely because its timestamp expired', async () => {
    const { id } = await h.add();
    const claim = await h.fixtureClaim(id, true);
    expect(
      await h.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('APPLIED');
  });

  it('rejects malformed claim coordinates and batches before allocating work', async () => {
    const { id } = await h.add();
    await expect(h.consumption.claim(33)).rejects.toBeInstanceOf(TypeError);
    await expect(
      h.consumption.load({
        admissionId: id,
        epoch: 0n,
        sequence: 0n,
        token: randomUUID(),
        leaseUntil: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(await h.prisma.gamificationConsumptionAttempt.count()).toBe(0);
  });

  it('rolls back the whole claim batch if a later attempt insert fails', async () => {
    await h.add();
    await h.add();
    await h.pool
      .query(`CREATE FUNCTION synthetic_c21_attempt_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF (SELECT count(*) FROM gamification_consumption_attempts)>0 THEN RAISE EXCEPTION 'synthetic claim attempt failure'; END IF; RETURN NEW; END $$`);
    await h.pool.query(
      `CREATE TRIGGER synthetic_c21_attempt_failure BEFORE INSERT ON gamification_consumption_attempts FOR EACH ROW EXECUTE FUNCTION synthetic_c21_attempt_failure()`,
    );
    await expect(h.consumption.claim(2)).rejects.toThrow(
      'synthetic claim attempt failure',
    );
    expect(await h.prisma.gamificationConsumptionAttempt.count()).toBe(0);
    expect(
      await h.prisma.gamificationConsumptionReceipt.count({
        where: { state: 'READY', claimSequence: 0n, claimToken: null },
      }),
    ).toBe(2);
  });

  it('rolls back completed flags if attempt settlement fails', async () => {
    const { id } = await h.add();
    const [claim] = await h.consumption.claim();
    await h.pool.query(
      `CREATE FUNCTION synthetic_c21_settlement_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic attempt settlement failure'; END $$`,
    );
    await h.pool.query(
      `CREATE TRIGGER synthetic_c21_settlement_failure BEFORE UPDATE ON gamification_consumption_attempts FOR EACH ROW EXECUTE FUNCTION synthetic_c21_settlement_failure()`,
    );
    await expect(
      h.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).rejects.toThrow('synthetic attempt settlement failure');
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({
      state: 'RUNNING',
      claimToken: claim.token,
      achievementsDone: false,
    });
    expect(
      await h.prisma.gamificationConsumptionAttempt.findUniqueOrThrow({
        where: { claimToken: claim.token },
      }),
    ).toMatchObject({ state: 'OPEN', finishedAt: null });
  });

  it('rolls back new progress if receipt release fails', async () => {
    const { id, scope } = await h.add();
    const [claim] = await h.consumption.claim();
    await h.pool.query(
      `CREATE FUNCTION synthetic_c21_release_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic receipt release failure'; END $$`,
    );
    await h.pool.query(
      `CREATE TRIGGER synthetic_c21_release_failure BEFORE UPDATE ON gamification_consumption_receipts FOR EACH ROW EXECUTE FUNCTION synthetic_c21_release_failure()`,
    );
    await expect(
      h.consumption.continueOwner(claim, {
        owner: 'ACHIEVEMENTS',
        progress: { scope, generation: '1', sequence: '1' },
      }),
    ).rejects.toThrow('synthetic receipt release failure');
    expect(await h.prisma.gamificationOwnerProgress.count()).toBe(0);
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({ state: 'RUNNING', claimToken: claim.token });
    expect(
      await h.prisma.gamificationConsumptionAttempt.findUniqueOrThrow({
        where: { claimToken: claim.token },
      }),
    ).toMatchObject({ state: 'OPEN' });
  });

  it('preserves prior technical failures through valid continued progress', async () => {
    const { id, scope } = await h.add(2);
    const [claim] = await h.consumption.claim();
    await h.consumption.continueOwner(claim, {
      owner: 'ACHIEVEMENTS',
      progress: { scope, generation: '1', sequence: '1' },
    });
    const [next] = await h.consumption.claim();
    expect((await h.consumption.load(next))?.progress).toEqual({
      scope,
      generation: '1',
      sequence: '1',
    });
    await h.consumption.fail(next, 'OWNER_FAILURE');
    expect(
      await h.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: id },
      }),
    ).toMatchObject({
      state: 'RETRY_DUE',
      technicalFailures: 3,
      pointsDone: true,
      levelsDone: true,
    });
  });
});
