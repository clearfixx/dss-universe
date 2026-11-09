/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Local Gamification Investigation
 * 📄 File: tools/agent-helpers/gamification/inspect-c21-evidence-lengths.mjs
 * 🎯 Purpose: Measures aggregate evidence lengths in the disposable public schema.
 * 🧠 Responsibilities: Emits counts/byte maxima without row identities or credentials.
 * 🏗️ Architecture: Read-only helper, no application or migration entrypoint.
 * ⚠️ Important: Empty fixtures and local maxima never certify production compatibility.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../../../", import.meta.url);
const require = createRequire(new URL("apps/api/package.json", root));
const { Client } = require("pg");
const compose = readFileSync(new URL("docker-compose.test.yml", root), "utf8");
const password = compose.match(
  /^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$/m,
)?.[1];
if (!password) throw new Error("Disposable credential unavailable.");
const client = new Client({
  host: "127.0.0.1",
  port: 5434,
  user: "dss_test",
  database: "dss_test",
  password,
});

try {
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const result = await client.query(`
    SELECT count(*)::text AS "events",
      max(octet_length("entryId")) AS "entryIdBytes",
      max(octet_length("actorId")) AS "actorIdBytes",
      max(octet_length("recipientId")) AS "recipientIdBytes",
      max(octet_length("originalEntryId")) AS "originalEntryIdBytes",
      count(*) FILTER (WHERE greatest(
        octet_length("entryId"), octet_length("actorId"),
        octet_length("recipientId"), octet_length("originalEntryId")
      ) > 16384)::text AS "overProposedStringLimit"
    FROM public.reputation_qualification_events
  `);
  await client.query("ROLLBACK");
  const evidence = {
    schemaVersion: 1,
    target: "disposable5434/public",
    observedAt: new Date().toISOString(),
    readOnly: true,
    aggregate: result.rows[0],
    productionCompatibilityProven: false,
    limitation:
      "Public schema only; isolated E2E schemas and deployed data excluded.",
  };
  const output = new URL(
    "../debt007-c21-evidence-lengths.local.json",
    import.meta.url,
  );
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ ...evidence, report: fileURLToPath(output) }));
} catch (error) {
  console.error(
    JSON.stringify({
      status: "FAILED",
      code: /^[A-Z0-9_]{1,64}$/.test(error?.code ?? "")
        ? error.code
        : "UNCLASSIFIED",
      message:
        "Read-only aggregate inspection failed; connection details omitted.",
    }),
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
