/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM E2E Fixtures
 * 📄 File: apps/api/test/helpers/access-group-cleanup.fixture.ts
 *
 * 🎯 Purpose:
 * Removes only owned HTTP fixtures from the explicitly disposable test database.
 *
 * 🧠 Responsibilities:
 * • rejects non-test connections and non-UUID fixture identifiers;
 * • scopes history cleanup to exact subjects inside a table-locked transaction;
 * • restores the history trigger before commit, with rollback on any failure.
 *
 * 🏗️ Architecture:
 * Privileged test teardown, never an application API or production retention policy.
 *
 * ⚠️ Important:
 * Production membership history is immutable. Isolated-schema tests instead drop
 * their own schema; real AppModule E2E needs this guarded fixture-only teardown.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';

export async function cleanupAccessGroupFixtures(
  prisma: PrismaService,
  subjects: readonly string[],
  groupIds: readonly string[] = [],
): Promise<void> {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/dss_test' ||
    url.username !== 'dss_test'
  )
    throw new Error(
      'Refusing membership teardown outside disposable dss_test.',
    );
  if (
    ![...subjects, ...groupIds].every((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    )
  )
    throw new Error('Expected exact owned UUID fixtures.');
  if (!subjects.length && !groupIds.length) return;
  await prisma.transaction(async (tx) => {
    const database = await tx.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    if (database[0]?.name !== 'dss_test')
      throw new Error('Unexpected teardown database.');
    await tx.$executeRawUnsafe(
      'ALTER TABLE public.access_group_memberships DISABLE TRIGGER access_membership_history_guard',
    );
    if (subjects.length)
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM public.access_group_memberships WHERE "subjectId" IN (${Prisma.join([...subjects])})`,
      );
    await tx.$executeRawUnsafe(
      'ALTER TABLE public.access_group_memberships ENABLE TRIGGER access_membership_history_guard',
    );
    if (groupIds.length) {
      await tx.accessGroupCapability.deleteMany({
        where: { groupId: { in: [...groupIds] } },
      });
      await tx.accessGroup.deleteMany({ where: { id: { in: [...groupIds] } } });
    }
  });
}
