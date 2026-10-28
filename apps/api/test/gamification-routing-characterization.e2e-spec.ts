/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Routing Design Verification
 * 📄 File: apps/api/test/gamification-routing-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Characterizes canonical timestamps and late-commit discovery alternatives.
 *
 * 🧠 Responsibilities:
 * • compares a forward cursor with complete reconciliation on real PostgreSQL;
 * • verifies inclusive boundaries and finite sweep windows without sleeps.
 *
 * 🏗️ Architecture:
 * Design-only SQL experiments against an owned migrated schema.
 *
 * ⚠️ Important:
 * The fixture index is not a production migration or routing implementation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Key = { id: string; at: string };
const cutoff = '2026-10-28 00:00:00.000';
const first = '2026-10-28 00:00:00.001';
const second = '2026-10-28 00:00:00.002';
const tail = '2026-10-28 00:00:00.003';

describe('Gamification routing SQL characterization (no runtime admission)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let pool: Pool;
  let table: string;
  const columns = `id, to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS at`;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    if (!/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema)) {
      throw new Error('Unexpected owned fixture schema');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    table = `"${fixture.schema}"."outbox_events"`;
    await pool.query(
      `CREATE INDEX routing_probe_created_id_idx ON ${table} ("createdAt", id)`,
    );
  }, 60000);
  afterAll(async () => {
    try {
      await pool?.end();
    } finally {
      await fixture?.close();
    }
  });

  async function insert(
    tag: string,
    at: string,
    target: Pool | PoolClient = pool,
    id = randomUUID(),
    status = 'PENDING',
  ) {
    const result = await target.query<Key>(
      `INSERT INTO ${table}
       (id, "eventName", "eventVersion", "eventCategory", producer, payload,
        "occurredAt", "createdAt", "updatedAt", status)
       VALUES ($1, $2, 1, 'integration', 'synthetic.routing-design', '{}'::jsonb,
               $3::timestamp(3), $3::timestamp(3), $3::timestamp(3), $4)
       RETURNING ${columns}`,
      [id, tag, at, status],
    );
    return result.rows[0];
  }

  async function window(
    tag: string,
    cursor: Key | null,
    upper: Key | null,
    limit: number,
  ) {
    const result = await pool.query<Key>(
      `SELECT ${columns} FROM ${table}
       WHERE "eventName" = $1 AND "createdAt" >= $2::timestamp(3)
         AND ($3::timestamp(3) IS NULL OR ("createdAt", id) > ($3::timestamp(3), $4::uuid))
         AND ($5::timestamp(3) IS NULL OR ("createdAt", id) <= ($5::timestamp(3), $6::uuid))
       ORDER BY "createdAt", id LIMIT $7`,
      [
        tag,
        cutoff,
        cursor?.at ?? null,
        cursor?.id ?? null,
        upper?.at ?? null,
        upper?.id ?? null,
        limit,
      ],
    );
    return result.rows;
  }

  async function upper(tag: string) {
    const result = await pool.query<Key>(
      `SELECT ${columns} FROM ${table} WHERE "eventName"=$1 AND "createdAt">=$2::timestamp(3)
       ORDER BY "createdAt" DESC, id DESC LIMIT 1`,
      [tag, cutoff],
    );
    return result.rows[0] ?? null;
  }

  it('uses the existing transaction timestamp default without claiming insertion/commit wall time', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      const result = await client.query<{
        same_transaction_time: boolean;
        kind: string;
      }>(
        `INSERT INTO ${table}
         (id, "eventName", "eventVersion", "eventCategory", producer, payload, "occurredAt", "updatedAt")
         VALUES ($1, 'synthetic.routing.clock.v1', 1, 'integration', 'synthetic.routing-design', '{}'::jsonb,
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING "createdAt" = CURRENT_TIMESTAMP::timestamp(3) AS same_transaction_time,
                   pg_typeof("createdAt")::text AS kind`,
        [randomUUID()],
      );
      expect(result.rows).toEqual([
        { same_transaction_time: true, kind: 'timestamp without time zone' },
      ]);
    } finally {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
  });

  it('demonstrates why a mixed timestamp/timestamptz cutoff can change with session timezone', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL TIME ZONE 'America/New_York'");
      const result = await client.query<{ mixed: boolean; same_type: boolean }>(
        `SELECT timestamp '2026-01-01 00:00:00' >= timestamptz '2026-01-01 02:00:00+00' AS mixed,
                timestamp '2026-01-01 00:00:00' >= timestamp '2026-01-01 02:00:00' AS same_type`,
      );
      expect(result.rows).toEqual([{ mixed: true, same_type: false }]);
    } finally {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
  });

  it('loses a real late commit with a sole forward cursor, while complete reconciliation finds it', async () => {
    const tag = `synthetic.routing.${randomUUID()}.v1`;
    const lateClient = await pool.connect();
    let pending = false;
    try {
      await lateClient.query('BEGIN');
      pending = true;
      const late = await insert(tag, first, lateClient);
      const early = await insert(tag, second);
      expect(await window(tag, null, null, 10)).toEqual([early]);
      await lateClient.query('COMMIT');
      pending = false;
      expect(await window(tag, early, null, 10)).toEqual([]);
      const reconciled = await pool.query<Key>(
        `SELECT ${columns} FROM ${table} e
         WHERE "eventName"=$1 AND "createdAt">=$2::timestamp(3)
           AND NOT EXISTS (SELECT 1 FROM unnest($3::uuid[]) AS known(id) WHERE known.id=e.id)
         ORDER BY "createdAt", id`,
        [tag, cutoff, [early.id]],
      );
      expect(reconciled.rows).toEqual([late]);
    } finally {
      try {
        if (pending) await lateClient.query('ROLLBACK');
      } finally {
        lateClient.release();
      }
    }
  });

  it('finishes a fixed sweep despite a growing tail and finds prefix commits on the next complete epoch', async () => {
    const tag = `synthetic.routing.${randomUUID()}.v1`;
    await insert(tag, '2026-10-27 23:59:59.999');
    const equality = await insert(
      tag,
      cutoff,
      pool,
      '00000000-0000-0000-0000-000000000000',
      'PUBLISHED',
    );
    const early = await insert(tag, second, pool, randomUUID(), 'PROCESSING');
    const fixedUpper = await upper(tag);
    expect(fixedUpper).toEqual(early);
    expect(await window(tag, null, fixedUpper, 1)).toEqual([equality]);
    const newTail = await insert(tag, tail);
    expect(await window(tag, equality, fixedUpper, 1)).toEqual([early]);
    const latePrefix = await insert(tag, first);
    expect(await window(tag, early, fixedUpper, 1)).toEqual([]);
    const next = await window(tag, null, await upper(tag), 10);
    expect(next).toEqual([equality, latePrefix, early, newTail]);
    const alreadyAdmitted = new Set([equality.id, early.id]);
    expect(next.filter(({ id }) => !alreadyAdmitted.has(id))).toEqual([
      latePrefix,
      newTail,
    ]);
  });
});
