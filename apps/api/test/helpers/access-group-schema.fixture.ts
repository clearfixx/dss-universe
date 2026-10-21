/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Integration Fixtures
 * 📄 File: apps/api/test/helpers/access-group-schema.fixture.ts
 *
 * 🎯 Purpose:
 * Applies the real access-group migration only inside explicitly owned test schemas.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';

export async function applyAccessGroupMigration(pool: Pool): Promise<void> {
  const connection = await pool.connect();
  try {
    const current = await connection.query<{ schema: string }>(
      'SELECT current_schema() AS schema',
    );
    if (
      !/^(access_groups_|gate_audience_)[a-f0-9]+$/.test(current.rows[0].schema)
    )
      throw new Error(
        'Refusing access migration fixture outside its isolated schema.',
      );
    await connection.query('BEGIN');
    await connection.query(`
      CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'SERVICE');
      CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');
      ALTER TABLE audit_records ALTER COLUMN "actorType" TYPE "AuditActorType" USING "actorType"::text::"AuditActorType";
      ALTER TABLE audit_records ALTER COLUMN result DROP DEFAULT;
      ALTER TABLE audit_records ALTER COLUMN result TYPE "AuditResult" USING result::text::"AuditResult";
      ALTER TABLE audit_records ALTER COLUMN result SET DEFAULT 'SUCCESS'::"AuditResult";
    `);
    await connection.query(
      readFileSync(
        resolve(
          __dirname,
          '../../prisma/migrations/20261013190000_iam_access_groups/migration.sql',
        ),
        'utf8',
      ),
    );
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}
