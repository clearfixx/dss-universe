/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification E2E Fixtures
 * 📄 File: apps/api/test/helpers/migrated-gamification-schema.fixture.ts
 *
 * 🎯 Purpose:
 * Applies real migrations to an owned schema, preserving immutable production history.
 *
 * 🧠 Responsibilities:
 * • validates disposable connection and rejects public-qualified fixture DDL;
 *
 * 🏗️ Architecture:
 * Test-only full migration fixture; never imported by production.
 *
 * ⚠️ Important:
 * Drop only the generated owned schema; do not disable immutable-history triggers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '@api/core/database';

export async function createGamificationSchemaFixture() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/dss_test' ||
    url.username !== 'dss_test'
  )
    throw new Error('Expected the disposable loopback dss_test database.');
  const schema = `gamification_boundary_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  let created = false;
  async function close() {
    await prisma.$disconnect();
    await pool.end();
    if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    const migrations = resolve(__dirname, '../../prisma/migrations');
    const directories = (await readdir(migrations, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const connection = await pool.connect();
    try {
      const current = await connection.query<{ name: string }>(
        'SELECT current_schema() AS name',
      );
      if (current.rows[0].name !== schema)
        throw new Error('Unexpected fixture search path.');
      for (const directory of directories) {
        const sql = await readFile(
          resolve(migrations, directory, 'migration.sql'),
          'utf8',
        );
        // Future public-qualified DDL must never be executed by this private-schema fixture.
        if (
          /\bpublic\s*\.|"public"\s*\.|\bSET\s+(?:LOCAL\s+)?search_path\b/i.test(
            sql,
          )
        )
          throw new Error(`Migration escapes isolated fixture: ${directory}`);
        await connection.query('BEGIN');
        try {
          await connection.query(sql);
          await connection.query('COMMIT');
        } catch (error) {
          await connection.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      connection.release();
    }
    return { schema, prisma, close };
  } catch (error) {
    await close();
    throw error;
  }
}
