/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Persistence Audit
 * 📄 File: scripts/audit-media-retry.mjs
 *
 * 🎯 Purpose:
 * Regresses automatic Media retry using built Worker code and migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • owns and removes one isolated schema in the disposable test database;
 * • executes real processor/store with only file/scanner boundary doubles;
 * • verifies automatic repeat completes without an administrative state repair.
 *
 * 🏗️ Architecture:
 * Test-only diagnostic; build Worker before running. Never imported by production.
 *
 * ⚠️ Important:
 * Assertions verify the approved failed-state CAS correction, not a global lease.
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
  application_name: schema,
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
  let scanMode = "CLEAN";
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
        if (scanMode === "UNAVAILABLE")
          throw new Error("synthetic scanner unavailable");
        if (scanMode === "INFECTED")
          return { status: "INFECTED", threatName: "synthetic threat" };
        return { status: "CLEAN" };
      },
    },
  );
  await assert.rejects(
    process({ data }),
    /synthetic transient transform failure/,
  );
  assert.equal(await store.findStatus(id), "FAILED");
  await process({ data });
  assert.equal(await store.findStatus(id), "READY");
  assert.equal(attempts, 2);
  await process({ data });
  assert.equal(await store.findStatus(id), "READY");
  assert.equal(attempts, 2);
  console.log(
    "Verified: automatic repeat reaches READY; subsequent delivery is a no-op.",
  );

  await pool.query(
    `UPDATE media SET status='FAILED', "failureCode"='OLD', "failureReason"='old failure' WHERE id=$1`,
    [id],
  );
  const holder = await pool.connect();
  let claims;
  let released = false;
  try {
    await holder.query("BEGIN");
    await holder.query("SELECT id FROM media WHERE id=$1 FOR UPDATE", [id]);
    const holderPid = (await holder.query("SELECT pg_backend_pid() AS pid"))
      .rows[0].pid;
    claims = [store.claimFailedRetry(id), store.claimFailedRetry(id)];
    const until = Date.now() + 1500;
    let waiting = 0;
    while (Date.now() < until) {
      waiting = (
        await pool.query(
          `SELECT count(*)::int AS count FROM pg_stat_activity
             WHERE application_name=$1 AND wait_event_type='Lock'
               AND cardinality(pg_blocking_pids(pid)) > 0
               AND query LIKE 'UPDATE "media" SET%' AND pid<>$2`,
          [schema, holderPid],
        )
      ).rows[0].count;
      if (waiting === 2) break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    await holder.query("COMMIT");
    released = true;
    const results = await Promise.all(claims);
    assert.equal(
      waiting,
      2,
      "Both actual CAS queries must wait on the owned row lock",
    );
    assert.deepEqual(results.sort(), [false, true]);
    const row = (
      await pool.query(
        'SELECT status, "failureCode", "failureReason" FROM media WHERE id=$1',
        [id],
      )
    ).rows[0];
    assert.deepEqual(row, {
      status: "PROCESSING",
      failureCode: null,
      failureReason: null,
    });
  } finally {
    if (!released) await holder.query("ROLLBACK");
    if (claims) await Promise.allSettled(claims);
    holder.release();
  }
  for (const status of [
    "READY",
    "REJECTED",
    "DELETED",
    "DELETING",
    "QUARANTINED",
    "PENDING",
    "PROCESSING",
  ]) {
    await pool.query(
      `UPDATE media SET status=$2::"MediaStatus", "failureCode"='KEEP' WHERE id=$1`,
      [id, status],
    );
    assert.equal(await store.claimFailedRetry(id), false);
    assert.equal(await store.findStatus(id), status);
    assert.equal(
      (await pool.query('SELECT "failureCode" FROM media WHERE id=$1', [id]))
        .rows[0].failureCode,
      "KEEP",
    );
  }
  assert.equal(await store.claimFailedRetry(randomUUID()), false);
  await pool.query(
    `UPDATE media SET status='FAILED', "deletedAt"=NOW() WHERE id=$1`,
    [id],
  );
  assert.equal(await store.claimFailedRetry(id), false);
  await pool.query(`UPDATE media SET "deletedAt"=NULL WHERE id=$1`, [id]);
  scanMode = "UNAVAILABLE";
  await assert.rejects(process({ data }), /synthetic scanner unavailable/);
  assert.equal(await store.findStatus(id), "QUARANTINED");
  assert.equal(attempts, 2);
  await pool.query(`UPDATE media SET status='FAILED' WHERE id=$1`, [id]);
  scanMode = "INFECTED";
  assert.equal((await process({ data })).quarantined, true);
  assert.equal(await store.findStatus(id), "QUARANTINED");
  assert.equal(attempts, 2);
  scanMode = "CLEAN";
  await process({ data });
  assert.equal(await store.findStatus(id), "READY");
  await pool.query(`UPDATE media SET status='REJECTED' WHERE id=$1`, [id]);
  await assert.rejects(
    store.markReady(data, {
      original,
      variants: [{ ...original, name: "audit-variant" }],
    }),
    /was not found/,
  );
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int AS count FROM media_variants WHERE "mediaId"=$1',
        [id],
      )
    ).rows[0].count,
    0,
  );
  assert.equal(await store.findStatus(id), "REJECTED");
  console.log(
    "Verified: two blocked CAS contenders yield one winner; terminal/deleted predicates, retry quarantine and variant rollback hold.",
  );
} finally {
  await pool.end();
  if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.end();
}
