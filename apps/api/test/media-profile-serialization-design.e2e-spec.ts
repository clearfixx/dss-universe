/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media / Serialization Design Evidence
 * 📄 File: apps/api/test/media-profile-serialization-design.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Compares profile-assignment SQL protocols against the real cleanup transaction.
 *
 * 🧠 Responsibilities:
 * • observes PostgreSQL blocking to establish competing transaction schedules;
 * • distinguishes a row lock from a conditional MVCC write guard;
 * • records rollback, reverse-order and unchanged-field controls for both slots.
 *
 * 🏗️ Architecture:
 * Test-only protocol prototype in a fully migrated, owned disposable schema.
 * Cleanup/guard/Audit use actual adapters; remaining assignment writes are a SQL prototype.
 *
 * ⚠️ Important:
 * A pass-through observer records real underlying cleanup errors without changing results.
 * These are not HTTP correction tests; public behavior has separate regressions.
 * No Storage IO, global locks, schema migration or transaction timeout change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { MediaStatus, Prisma } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { AuditRedactionService } from '@api/core/audit/services/audit-redaction.service';
import {
  guardReadyPublicProfileMediaForAssignment,
  PrismaMediaLibraryOperations,
} from '@api/modules/media/infrastructure';
import { PrismaProfileAwareMediaLibrary } from '../src/composition/media-library/infrastructure/prisma-profile-aware-media-library';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Slot = 'AVATAR' | 'COVER';
type Protocol = 'ROW_LOCK_ONLY' | 'WRITE_VERSION';
const cutoff = new Date('2025-01-01');
const originalUpdatedAt = new Date('2021-01-01');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('DEBT072 SQL protocol design evidence (not runtime acceptance)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let controls: Pool;
  let library: PrismaProfileAwareMediaLibrary;
  const audit = new AuditWriterService(new AuditRedactionService());

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    controls = new Pool({ connectionString: process.env.DATABASE_URL });
    library = new PrismaProfileAwareMediaLibrary(fixture.prisma, audit);
  }, 60000);
  afterAll(async () => {
    try {
      await controls?.end();
    } finally {
      await fixture?.close();
    }
  });

  async function seed() {
    const id = randomUUID();
    const user = await fixture.prisma.user.create({
      data: {
        username: `protocol-${id}`,
        email: `${id}@dss.test`,
        passwordHash: 'synthetic-protocol-fixture-not-a-login-credential',
      },
    });
    const media = await fixture.prisma.media.create({
      data: {
        ownerId: user.id,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PUBLIC',
        storageProvider: 'LOCAL',
        bucket: 'design-fixture',
        storageKey: id,
        originalFilename: 'synthetic.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: id,
        createdAt: new Date('2020-01-01'),
        updatedAt: originalUpdatedAt,
      },
    });
    return { user, media };
  }
  type Fixture = Awaited<ReturnType<typeof seed>>;

  // The lock-only branch is an intentionally weaker negative control, never production assignment.
  async function guard(
    tx: TransactionClient,
    item: Fixture,
    protocol: Protocol,
  ) {
    if (protocol === 'ROW_LOCK_ONLY')
      return tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM media
        WHERE id=${item.media.id} AND "ownerId"=${item.user.id}
          AND status='READY' AND visibility='PUBLIC'
        FOR UPDATE
      `);
    const allowed = await guardReadyPublicProfileMediaForAssignment(
      tx,
      item.media.id,
      item.user.id,
    );
    return allowed ? [{ id: item.media.id }] : [];
  }
  async function writeBinding(
    tx: TransactionClient,
    item: Fixture,
    slot: Slot,
  ) {
    const purpose = slot === 'AVATAR' ? 'avatar' : 'cover';
    await tx.mediaReference.create({
      data: {
        mediaId: item.media.id,
        targetType: 'User',
        targetId: item.user.id,
        purpose,
        createdBy: item.user.id,
      },
    });
    await tx.user.update({
      where: { id: item.user.id },
      data:
        slot === 'AVATAR'
          ? { avatarMediaId: item.media.id, avatarUrl: '/synthetic-avatar' }
          : { coverMediaId: item.media.id, coverUrl: '/synthetic-cover' },
    });
    await audit.append(tx, {
      action: `user.${purpose}.assigned`,
      actorType: 'USER',
      actorId: item.user.id,
      targetType: 'User',
      targetId: item.user.id,
      metadata: { mediaId: item.media.id },
    });
  }
  async function state(item: Fixture, slot: Slot) {
    const user = await fixture.prisma.user.findUniqueOrThrow({
      where: { id: item.user.id },
      select: { avatarMediaId: true, coverMediaId: true },
    });
    return {
      media: await fixture.prisma.media.findUniqueOrThrow({
        where: { id: item.media.id },
      }),
      binding: slot === 'AVATAR' ? user.avatarMediaId : user.coverMediaId,
      references: await fixture.prisma.mediaReference.count({
        where: { mediaId: item.media.id, removedAt: null },
      }),
      assignmentAudit: await fixture.prisma.auditRecord.count({
        where: { targetId: item.user.id, action: { endsWith: '.assigned' } },
      }),
      claimAudit: await fixture.prisma.auditRecord.count({
        where: { targetId: item.media.id, action: 'media.cleanup.claimed' },
      }),
    };
  }
  async function waitForBlockedCleanup(blockerPid: number) {
    const until = Date.now() + 2000;
    while (Date.now() < until) {
      const result = await controls.query<{ waiting: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity
          WHERE datname=current_database() AND state='active'
            AND $1::int=ANY(pg_blocking_pids(pid))
        ) AS waiting`,
        [blockerPid],
      );
      if (result.rows[0].waiting) return true;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    return false;
  }

  async function compete(
    item: Fixture,
    slot: Slot,
    protocol: Protocol,
    rollback = false,
  ) {
    const guarded = deferred<number>();
    const resume = deferred<void>();
    const rollbackError = new Error('synthetic assignment rollback');
    const conflicts: unknown[] = [];
    const observe = jest.spyOn(
      PrismaMediaLibraryOperations.prototype,
      'claimCleanupCandidates',
    );
    const actualClaim = observe.getMockImplementation();
    if (!actualClaim)
      throw new Error('Missing actual owner claim implementation.');
    observe.mockImplementation(async function (
      this: PrismaMediaLibraryOperations,
      ...args: Parameters<
        PrismaMediaLibraryOperations['claimCleanupCandidates']
      >
    ) {
      try {
        const boundClaim = actualClaim.bind(
          this,
        ) as PrismaMediaLibraryOperations['claimCleanupCandidates'];
        return await boundClaim(...args);
      } catch (error) {
        conflicts.push(error);
        throw error;
      }
    });
    const assignment = fixture.prisma.$transaction(async (tx) => {
      expect(await guard(tx, item, protocol)).toEqual([{ id: item.media.id }]);
      const [connection] = await tx.$queryRaw<
        { pid: number }[]
      >`SELECT pg_backend_pid() AS pid`;
      const [isolation] = await tx.$queryRaw<
        { level: string }[]
      >`SELECT current_setting('transaction_isolation') AS level`;
      expect(isolation.level).toBe('read committed');
      guarded.resolve(connection.pid);
      await resume.promise;
      await writeBinding(tx, item, slot);
      if (rollback) throw rollbackError;
    });
    const assignmentOutcome = assignment.then(
      () => ({ ok: true as const }),
      (error: unknown) => {
        guarded.reject(error);
        return { ok: false as const, error };
      },
    );
    let cleanup: ReturnType<typeof library.claimCleanupCandidates> | undefined;
    try {
      const blocker = await guarded.promise;
      cleanup = library.claimCleanupCandidates(cutoff, 50);
      const cleanupOutcome = cleanup.then(
        (claims) => ({ ok: true as const, claims }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      expect(await waitForBlockedCleanup(blocker)).toBe(true);
      resume.resolve();
      return {
        assignment: await assignmentOutcome,
        cleanup: await cleanupOutcome,
        rollbackError,
        conflicts,
      };
    } finally {
      resume.resolve();
      await assignmentOutcome;
      await cleanup?.catch(() => undefined);
      observe.mockRestore();
    }
  }

  it.each(['AVATAR', 'COVER'] as const)(
    'shows row locking alone still permits stale cleanup after %s commits',
    async (slot) => {
      const item = await seed();
      const result = await compete(item, slot, 'ROW_LOCK_ONLY');
      expect(result.assignment.ok).toBe(true);
      expect(result.cleanup.ok).toBe(true);
      if (!result.cleanup.ok) throw result.cleanup.error;
      expect(result.cleanup.claims.map((claim) => claim.mediaId)).toContain(
        item.media.id,
      );
      expect(await state(item, slot)).toMatchObject({
        media: { status: 'DELETING' },
        binding: item.media.id,
        references: 1,
        assignmentAudit: 1,
        claimAudit: 1,
      });
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'defers stale cleanup after the conditional %s write guard commits',
    async (slot) => {
      const item = await seed();
      const result = await compete(item, slot, 'WRITE_VERSION');
      expect(result.assignment.ok).toBe(true);
      expect(result.cleanup).toEqual({ ok: true, claims: [] });
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({ code: 'P2034' });
      expect(result.conflicts[0]).toBeInstanceOf(
        Prisma.PrismaClientKnownRequestError,
      );
      expect(await state(item, slot)).toMatchObject({
        media: { status: 'READY', updatedAt: originalUpdatedAt },
        binding: item.media.id,
        references: 1,
        assignmentAudit: 1,
        claimAudit: 0,
      });
      expect((await state(item, slot)).media).toEqual(item.media);
      expect(
        (await library.claimCleanupCandidates(cutoff, 50)).map(
          (claim) => claim.mediaId,
        ),
      ).not.toContain(item.media.id);
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'rolls back the entire cleanup batch and makes fresh progress after %s wins',
    async (slot) => {
      const unrelated = await seed();
      await fixture.prisma.media.update({
        where: { id: unrelated.media.id },
        data: { createdAt: new Date('2019-01-01') },
      });
      const item = await seed();
      const result = await compete(item, slot, 'WRITE_VERSION');
      expect(result.assignment.ok).toBe(true);
      expect(result.cleanup).toEqual({ ok: true, claims: [] });
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({ code: 'P2034' });
      expect(result.conflicts[0]).toBeInstanceOf(
        Prisma.PrismaClientKnownRequestError,
      );
      expect(await state(unrelated, slot)).toMatchObject({
        media: { status: 'READY' },
        binding: null,
        references: 0,
        claimAudit: 0,
      });
      const fresh = await library.claimCleanupCandidates(cutoff, 50);
      expect(fresh.map((claim) => claim.mediaId)).toContain(unrelated.media.id);
      expect(fresh.map((claim) => claim.mediaId)).not.toContain(item.media.id);
      expect(await state(unrelated, slot)).toMatchObject({
        media: { status: 'DELETING' },
        claimAudit: 1,
      });
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'rejects the %s write guard after an already committed cleanup claim',
    async (slot) => {
      const item = await seed();
      expect(
        (await library.claimCleanupCandidates(cutoff, 50)).map(
          (claim) => claim.mediaId,
        ),
      ).toContain(item.media.id);
      await fixture.prisma.$transaction(async (tx) => {
        expect(await guard(tx, item, 'WRITE_VERSION')).toEqual([]);
      });
      expect(await state(item, slot)).toMatchObject({
        media: { status: 'DELETING' },
        binding: null,
        references: 0,
        assignmentAudit: 0,
        claimAudit: 1,
      });
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'rolls back the %s guard, binding and evidence before cleanup continues',
    async (slot) => {
      const item = await seed();
      const result = await compete(item, slot, 'WRITE_VERSION', true);
      expect(result.assignment).toEqual({
        ok: false,
        error: result.rollbackError,
      });
      expect(result.cleanup.ok).toBe(true);
      if (!result.cleanup.ok) throw result.cleanup.error;
      expect(result.cleanup.claims.map((claim) => claim.mediaId)).toContain(
        item.media.id,
      );
      expect(await state(item, slot)).toMatchObject({
        media: { status: 'DELETING' },
        binding: null,
        references: 0,
        assignmentAudit: 0,
        claimAudit: 1,
      });
    },
  );
  it.each(Object.values(MediaStatus).filter((status) => status !== 'READY'))(
    'rejects %s Media without writing business fields',
    async (status) => {
      const item = await seed();
      const before = await fixture.prisma.media.update({
        where: { id: item.media.id },
        data: { status },
      });
      await fixture.prisma.$transaction(async (tx) => {
        expect(
          await guardReadyPublicProfileMediaForAssignment(
            tx,
            item.media.id,
            item.user.id,
          ),
        ).toBe(false);
      });
      expect(
        await fixture.prisma.media.findUniqueOrThrow({
          where: { id: item.media.id },
        }),
      ).toEqual(before);
    },
  );
  it('rejects PRIVATE, foreign-owner and missing IDs without modifying Media', async () => {
    const own = await seed();
    const foreign = await seed();
    const before = await fixture.prisma.media.update({
      where: { id: own.media.id },
      data: { visibility: 'PRIVATE' },
    });
    await fixture.prisma.$transaction(async (tx) => {
      expect(
        await guardReadyPublicProfileMediaForAssignment(
          tx,
          own.media.id,
          own.user.id,
        ),
      ).toBe(false);
      expect(
        await guardReadyPublicProfileMediaForAssignment(
          tx,
          foreign.media.id,
          own.user.id,
        ),
      ).toBe(false);
      expect(
        await guardReadyPublicProfileMediaForAssignment(
          tx,
          randomUUID(),
          own.user.id,
        ),
      ).toBe(false);
    });
    expect(
      await fixture.prisma.media.findUniqueOrThrow({
        where: { id: own.media.id },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.media.findUniqueOrThrow({
        where: { id: foreign.media.id },
      }),
    ).toEqual(foreign.media);
  });
});
