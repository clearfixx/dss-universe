/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/test/custom-title-selection-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies selection/revocation/deactivation serialization with migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • pauses only after the real eligibility query returns;
 * • observes real advisory-lock contention before releasing selection;
 * • inspects committed state without disabling history protections.
 *
 * 🏗️ Architecture:
 * Test-only query observer over real Prisma transactions in an owned schema.
 *
 * ⚠️ Important:
 * Real database reads and history protections remain enabled; no result mocks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import type { PrismaService } from '../src/core/database';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { OutboxWriterService } from '../src/core/events/services/outbox-writer.service';
import { PrismaCustomTitlesRepository } from '../src/modules/custom-titles/infrastructure/repositories/prisma-custom-titles.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Custom title selection atomicity (e2e)', () => {
  it.each(['select', 'revoke', 'deactivate'] as const)(
    'rolls back %s state and Audit when Outbox fails',
    async (operation) => {
      const fixture = await createIsolatedApiSchemaFixture();
      const outbox = new OutboxWriterService();
      try {
        const userId = randomUUID();
        await fixture.prisma.user.create({
          data: {
            id: userId,
            username: userId,
            email: `${userId}@dss.test`,
            passwordHash: 'synthetic-not-delivered',
          },
        });
        const title = await fixture.prisma.customTitle.create({
          data: {
            name: userId,
            slug: userId,
            color: '#000000',
            badge: 'test',
            createdById: userId,
            updatedById: userId,
          },
        });
        const grant = await fixture.prisma.userTitleGrant.create({
          data: {
            userId,
            titleId: title.id,
            grantedById: userId,
            grantReason: 'Synthetic rollback grant',
          },
        });
        const repository = new PrismaCustomTitlesRepository(
          fixture.prisma,
          new AuditWriterService(new AuditRedactionService()),
          outbox,
          {
            grant() {
              throw new Error('Grant path unused');
            },
          },
        );
        if (operation !== 'select')
          expect((await repository.select(userId, grant.id)).status).toBe('OK');
        const beforeSelection =
          await fixture.prisma.userTitleSelection.findUnique({
            where: { userId },
          });
        const beforeAudit = await fixture.prisma.auditRecord.count();
        const beforeOutbox = await fixture.prisma.outboxEvent.count();
        const failure = jest
          .spyOn(outbox, 'append')
          .mockRejectedValueOnce(new Error('synthetic Outbox failure'));
        const result =
          operation === 'select'
            ? repository.select(userId, grant.id)
            : operation === 'revoke'
              ? repository.revoke(grant.id, 'Synthetic revoke', userId)
              : repository.update({
                  id: title.id,
                  name: title.name,
                  slug: title.slug,
                  description: title.description,
                  color: title.color,
                  badge: title.badge,
                  isActive: false,
                  actorId: userId,
                });
        await expect(result).rejects.toThrow('synthetic Outbox failure');
        failure.mockRestore();
        expect(
          await fixture.prisma.userTitleSelection.findUnique({
            where: { userId },
          }),
        ).toEqual(beforeSelection);
        expect(
          await fixture.prisma.userTitleGrant.findUniqueOrThrow({
            where: { id: grant.id },
          }),
        ).toEqual(grant);
        expect(
          await fixture.prisma.customTitle.findUniqueOrThrow({
            where: { id: title.id },
          }),
        ).toEqual(title);
        expect(await fixture.prisma.auditRecord.count()).toBe(beforeAudit);
        expect(await fixture.prisma.outboxEvent.count()).toBe(beforeOutbox);
      } finally {
        jest.restoreAllMocks();
        await fixture.close();
      }
    },
    60000,
  );
  it.each([
    ['revoke', 'select'],
    ['deactivate', 'select'],
    ['revoke', 'mutation'],
    ['deactivate', 'mutation'],
  ] as const)(
    'serializes %s with %s first and leaves no invalid selection',
    async (mutation, first) => {
      const fixture = await createIsolatedApiSchemaFixture();
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      let ready!: () => void;
      const observed = new Promise<void>((resolve) => {
        ready = resolve;
      });
      let selection:
        | ReturnType<PrismaCustomTitlesRepository['select']>
        | undefined;
      let mutationResult: Promise<{ status: string }> | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const userId = randomUUID();
        await fixture.prisma.user.create({
          data: {
            id: userId,
            username: userId,
            email: `${userId}@dss.test`,
            passwordHash: 'synthetic-not-delivered',
          },
        });
        const title = await fixture.prisma.customTitle.create({
          data: {
            name: userId,
            slug: userId,
            color: '#000000',
            badge: 'test',
            createdById: userId,
            updatedById: userId,
          },
        });
        const grant = await fixture.prisma.userTitleGrant.create({
          data: {
            userId,
            titleId: title.id,
            grantedById: userId,
            grantReason: 'Synthetic audit grant',
          },
        });
        let realEligible = false;
        const client = fixture.prisma.$extends({
          query: {
            userTitleGrant: {
              async findFirst({ args, query }) {
                const row = await query(args);
                if (args.select || first !== 'select') return row;
                realEligible = row !== null && row.revokedAt === null;
                ready();
                await barrier;
                return row;
              },
              async update({ args, query }) {
                const row = await query(args);
                if (first === 'mutation' && mutation === 'revoke') {
                  realEligible = row.revokedAt !== null;
                  ready();
                  await barrier;
                }
                return row;
              },
            },
            customTitle: {
              async update({ args, query }) {
                const row = await query(args);
                if (first === 'mutation' && mutation === 'deactivate') {
                  realEligible = !row.isActive;
                  ready();
                  await barrier;
                }
                return row;
              },
            },
          },
        });
        const repository = new PrismaCustomTitlesRepository(
          client as unknown as PrismaService,
          new AuditWriterService(new AuditRedactionService()),
          new OutboxWriterService(),
          {
            grant() {
              throw new Error('Grant path unused');
            },
          },
        );
        deadline = setTimeout(() => {
          ready();
          release();
        }, 1500);
        const change = () =>
          mutation === 'revoke'
            ? repository.revoke(grant.id, 'Synthetic audit revoke', userId)
            : repository.update({
                id: title.id,
                name: title.name,
                slug: title.slug,
                description: title.description,
                color: title.color,
                badge: title.badge,
                isActive: false,
                actorId: userId,
              });
        if (first === 'select') selection = repository.select(userId, grant.id);
        else mutationResult = change();
        await observed;
        expect(realEligible).toBe(true);
        if (first === 'select') mutationResult = change();
        else selection = repository.select(userId, grant.id);
        const coordinate =
          mutation === 'revoke'
            ? `custom-titles:selection:${userId}`
            : `custom-titles:title:${title.id}`;
        const until = Date.now() + 1000;
        let waiting = false;
        while (Date.now() < until) {
          const rows = await fixture.prisma.$queryRaw<{ waiting: boolean }[]>`
            SELECT EXISTS (
              SELECT 1 FROM pg_locks
              WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
                AND classid::bigint =
                  ((hashtextextended(${coordinate}, 0) >> 32) & 4294967295)
                AND objid::bigint =
                  (hashtextextended(${coordinate}, 0) & 4294967295)
            ) AS waiting
          `;
          if (rows[0].waiting) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        release();
        expect((await selection!).status).toBe(
          first === 'select'
            ? 'OK'
            : mutation === 'revoke'
              ? 'NOT_FOUND'
              : 'INACTIVE',
        );
        expect((await mutationResult!).status).toBe('OK');
        expect(
          await fixture.prisma.userTitleSelection.findUnique({
            where: { userId },
          }),
        ).toBeNull();
        const committed = await fixture.prisma.userTitleGrant.findUniqueOrThrow(
          {
            where: { id: grant.id },
            include: { title: true },
          },
        );
        if (mutation === 'revoke') expect(committed.revokedAt).not.toBeNull();
        else expect(committed.title.isActive).toBe(false);
        // Sequential policy still denies the same now-ineligible grant.
        expect((await repository.select(userId, grant.id)).status).toBe(
          mutation === 'revoke' ? 'NOT_FOUND' : 'INACTIVE',
        );
      } finally {
        if (deadline) clearTimeout(deadline);
        release();
        if (selection) await Promise.allSettled([selection]);
        if (mutationResult) await Promise.allSettled([mutationResult]);
        await fixture.close();
      }
    },
    60000,
  );
});
