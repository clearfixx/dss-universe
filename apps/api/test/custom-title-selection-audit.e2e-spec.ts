/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles Audit
 * 📄 File: apps/api/test/custom-title-selection-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Characterizes selection/revocation/deactivation ordering with migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • pauses only after the real eligibility query returns;
 * • commits actual revocation or deactivation before releasing selection;
 * • inspects committed state without disabling history protections.
 *
 * 🏗️ Architecture:
 * Test-only query observer over real Prisma transactions in an owned schema.
 *
 * ⚠️ Important:
 * Undesired selection assertions are diagnostic, not accepted policy or a fix.
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

describe('Custom title selection audit (e2e)', () => {
  it.each(['revoke', 'deactivate'] as const)(
    'characterizes eligibility read followed by %s before selection commit',
    async (mutation) => {
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
                realEligible = row !== null && row.revokedAt === null;
                ready();
                await barrier;
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
        selection = repository.select(userId, grant.id);
        await observed;
        expect(realEligible).toBe(true);
        const changed =
          mutation === 'revoke'
            ? await repository.revoke(
                grant.id,
                'Synthetic audit revoke',
                userId,
              )
            : await repository.update({
                id: title.id,
                name: title.name,
                slug: title.slug,
                description: title.description,
                color: title.color,
                badge: title.badge,
                isActive: false,
                actorId: userId,
              });
        expect(changed.status).toBe('OK');
        release();
        expect((await selection).status).toBe('OK');
        const committed =
          await fixture.prisma.userTitleSelection.findUniqueOrThrow({
            where: { userId },
            include: { grant: { include: { title: true } } },
          });
        expect(committed.grantId).toBe(grant.id);
        if (mutation === 'revoke')
          expect(committed.grant.revokedAt).not.toBeNull();
        else expect(committed.grant.title.isActive).toBe(false);
        // Sequential policy still denies the same now-ineligible grant.
        expect((await repository.select(userId, grant.id)).status).toBe(
          mutation === 'revoke' ? 'NOT_FOUND' : 'INACTIVE',
        );
      } finally {
        if (deadline) clearTimeout(deadline);
        release();
        if (selection) await Promise.allSettled([selection]);
        await fixture.close();
      }
    },
    60000,
  );
});
