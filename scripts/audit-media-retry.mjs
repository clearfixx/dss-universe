/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Persistence Audit
 * 📄 File: scripts/audit-media-retry.mjs
 *
 * 🎯 Purpose:
 * Characterizes automatic Media retry using built Worker code and migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • owns and removes one isolated schema in the disposable test database;
 * • executes real processor/store with only file/scanner boundary doubles;
 * • distinguishes automatic repeat from explicit administrative retry claim.
 *
 * 🏗️ Architecture:
 * Test-only diagnostic; build Worker before running. Never imported by production.
 *
 * ⚠️ Important:
 * Assertions characterize existing undesired behavior, not a completed fix.
 * No live BullMQ, filesystem transform or malware scanning certification.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { createMediaProcessingProcessor } from "../apps/worker/dist/media-processing.processor.js";
import { PostgresMediaProcessingStore } from "../apps/worker/dist/postgres-media-processing.store.js";

const url = new URL(process.env.DATABASE_URL ?? "");
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert.equal(url.port, "5434");
assert.equal(url.pathname, "/dss_test");
assert.equal(url.username, "dss_test");
const schema = `audit_media_retry_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: url.href });
const pool = new Pool({
  connectionString: url.href,
  options: `-c search_path=${schema},public`,
});
let created = false;
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  const migrations = new URL("../apps/api/prisma/migrations/", import.meta.url);
  const connection = await pool.connect();
  try {
    assert.equal(
      (await connection.query("SELECT current_schema() AS name")).rows[0].name,
      schema,
    );
    const directories = (await readdir(migrations, { withFileTypes: true }))
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();
    for (const directory of directories) {
      const sql = await readFile(
        new URL(`${directory}/migration.sql`, migrations),
        "utf8",
      );
      assert(
        !/\bpublic\s*\.|"public"\s*\.|\bSET\s+(?:LOCAL\s+)?search_path\b/i.test(
          sql,
        ),
        "Migration escapes owned schema",
      );
      await connection.query("BEGIN");
      try {
        await connection.query(sql);
        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    connection.release();
  }
  const id = randomUUID();
  await pool.query(
    `INSERT INTO media (id, kind, status, visibility, "storageProvider", bucket, "storageKey", "originalFilename", "mimeType", extension, size, checksum, "updatedAt") VALUES ($1, 'DOCUMENT', 'PROCESSING', 'PRIVATE', 'LOCAL', 'audit', $2, 'test.txt', 'text/plain', 'txt', 1, $3, NOW())`,
    [id, `audit/${id}`, "a".repeat(64)],
  );
  const data = {
    mediaId: id,
    uploadSessionId: randomUUID(),
    ownerId: randomUUID(),
    policyKey: "attachment",
    storageProvider: "LOCAL",
    bucket: "audit",
    temporaryKey: `temporary/${id}`,
    destinationKey: `audit/${id}`,
    originalFilename: "test.txt",
    mimeType: "text/plain",
    size: 1,
    checksum: "a".repeat(64),
    scanRequired: true,
    processingKind: "PASSTHROUGH",
    variants: [],
    queuedAt: new Date().toISOString(),
  };
  const original = {
    storageKey: data.destinationKey,
    mimeType: data.mimeType,
    extension: "txt",
    size: 1,
    checksum: data.checksum,
    checksumSha1: "b".repeat(40),
    checksumMd5: "c".repeat(32),
    width: null,
    height: null,
  };
  let attempts = 0;
  const store = new PostgresMediaProcessingStore(pool);
  const process = createMediaProcessingProcessor(
    store,
    {
      async transform() {
        if (++attempts === 1)
          throw new Error("synthetic transient transform failure");
        return { original, variants: [] };
      },
      async cleanupSource() {},
    },
    {
      async scan() {
        return { status: "CLEAN" };
      },
    },
  );
  await assert.rejects(
    process({ data }),
    /synthetic transient transform failure/,
  );
  assert.equal(await store.findStatus(id), "FAILED");
  await assert.rejects(process({ data }), /was not found/);
  assert.equal(await store.findStatus(id), "FAILED");
  assert.equal(attempts, 2);
  // Control: explicit administrative retry claims PROCESSING before queue dispatch.
  await pool.query(
    `UPDATE media SET status='PROCESSING' WHERE id=$1 AND status='FAILED'`,
    [id],
  );
  await process({ data });
  assert.equal(await store.findStatus(id), "READY");
  console.log(
    "Confirmed: automatic repeat remains FAILED; explicit PROCESSING claim succeeds.",
  );
} finally {
  await pool.end();
  if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.end();
}
