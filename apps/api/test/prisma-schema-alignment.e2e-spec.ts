/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Alignment Tests
 * 📄 File: apps/api/test/prisma-schema-alignment.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies preserved SQL defaults/indexes and real generated-client behavior.
 *
 * 🏗️ Architecture:
 * Full historical migrations in an owned disposable schema; no repair DDL.
 *
 * ⚠️ Important:
 * Catalog checks cover all twelve defaults; CRUD checks are representative,
 * not a claim that every model/business use case was exercised here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Prisma and historical migration alignment (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
  }, 60000);
  afterAll(async () => {
    await fixture?.close();
  });

  it('preserves all twelve SQL defaults and both Users indexes', async () => {
    const columns = await fixture.prisma.$queryRaw<
      { table_name: string; column_default: string }[]
    >`
      SELECT table_name, column_default FROM information_schema.columns
      WHERE table_schema = ${fixture.schema} AND column_name = 'updatedAt'
        AND column_default IS NOT NULL ORDER BY table_name`;
    expect(columns).toEqual(
      [
        'achievement_definitions',
        'achievement_rules',
        'comments',
        'community_point_rules',
        'custom_title_settings',
        'custom_titles',
        'interaction_targets',
        'level_definitions',
        'reaction_aggregates',
        'reactions',
        'reputation_policy',
        'user_title_selections',
      ].map((table_name) => ({
        table_name,
        column_default: 'CURRENT_TIMESTAMP',
      })),
    );
    const indexes = await fixture.prisma.$queryRaw<
      { indexname: string; indexdef: string }[]
    >`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = ${fixture.schema} AND tablename = 'users'
        AND indexname IN ('users_loginLockedUntil_idx', 'users_status_deactivatedAt_idx')
      ORDER BY indexname`;
    expect(indexes.map(({ indexname }) => indexname)).toEqual([
      'users_loginLockedUntil_idx',
      'users_status_deactivatedAt_idx',
    ]);
    expect(indexes[0].indexdef).toContain('("loginLockedUntil")');
    expect(indexes[1].indexdef).toContain('(status, "deactivatedAt")');
  });

  it('creates with defaults and still advances updatedAt on client updates', async () => {
    const key = `schema-${randomUUID()}`;
    const created = await fixture.prisma.communityPointRule.create({
      data: { key, eventName: 'test.schema.v1', points: 1 },
    });
    expect(created.updatedAt).toBeInstanceOf(Date);
    const sentinel = new Date('2000-01-01T00:00:00.000Z');
    await fixture.prisma.communityPointRule.update({
      where: { key },
      data: { updatedAt: sentinel },
    });
    const updated = await fixture.prisma.communityPointRule.update({
      where: { key },
      data: { points: 2 },
    });
    expect(updated.points).toBe(2);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(sentinel.getTime());
    const raw = await fixture.prisma.$queryRaw<{ updatedAt: Date }[]>`
      INSERT INTO community_point_rules (key, "eventName", points)
      VALUES (${`raw-${randomUUID()}`}, 'test.raw-schema.v1', 1) RETURNING "updatedAt"`;
    expect(raw[0].updatedAt).toBeInstanceOf(Date);
  });

  it('round-trips native UUID Outbox IDs through actual generated-client queries', async () => {
    const created = await fixture.prisma.outboxEvent.create({
      data: {
        eventName: 'test.schema.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        producer: 'schema-alignment-test',
        payload: {},
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    expect(created.id).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    );
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: created.id },
      }),
    ).toEqual(created);
    const persisted = await fixture.prisma.$queryRaw<{ type: string }[]>`
      SELECT pg_typeof(id)::text AS type FROM outbox_events WHERE id = ${created.id}::uuid`;
    expect(persisted).toEqual([{ type: 'uuid' }]);
    expect(
      await fixture.prisma.outboxEvent.update({
        where: { id: created.id },
        data: { status: 'PUBLISHED' },
      }),
    ).toMatchObject({ id: created.id, status: 'PUBLISHED' });
  });
});
