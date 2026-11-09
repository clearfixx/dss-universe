/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Qualification Evidence Review
 * 📄 File: tools/agent-helpers/debt037/r6/review-evidence.mjs
 * 🎯 Purpose: Reviews an integrity-checked proof JSON against the actual source tree.
 * 🧠 Responsibilities: Checks envelope/actor schemas and recomputes unresolved-gate summaries.
 * 🏗️ Architecture: Read-only local review, importing only the named proof validator.
 * ⚠️ Important: Does not execute artifact content or infer production qualification.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRecord, validateRecords } from "./evidence-policy.mjs";
const [path, platform, expectedTree] = process.argv.slice(2);
assert.equal(process.argv.length, 5);
assert.ok(["linux", "darwin", "win32"].includes(platform));
assert.match(expectedTree, /^[a-f0-9]{40}$/);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const cache = realpathSync(resolve(root, "node_modules/.cache")) + sep;
const actual = realpathSync(path);
assert.ok(
  process.platform === "win32"
    ? actual.toLowerCase().startsWith(cache.toLowerCase())
    : actual.startsWith(cache),
);
const bytes = readFileSync(actual);
assert.ok(bytes.length > 0 && bytes.length <= 262144);
const value = JSON.parse(bytes.toString("utf8"));
assert.deepEqual(
  Object.keys(value).sort(),
  [
    "kind",
    "platform",
    "node",
    "sourceHead",
    "sourceTree",
    "binarySha256",
    "exitCode",
    "admitted",
    "filesystemQualified",
    "records",
    "summary",
    "invalidEvidence",
    "failure",
  ].sort(),
);
assert.equal(value.kind, "qualification-proof");
assert.equal(value.platform, platform);
assert.equal(
  value.node,
  "v" + readFileSync(resolve(root, ".node-version"), "utf8").trim(),
);
assert.match(value.sourceHead, /^[a-f0-9]{40}$/);
assert.equal(value.sourceTree, expectedTree);
assert.match(value.binarySha256, /^[a-f0-9]{64}$/);
assert.equal(value.admitted, false);
assert.equal(value.filesystemQualified, false);
assert.ok(
  value.exitCode === null ||
    (Number.isInteger(value.exitCode) &&
      value.exitCode >= 0 &&
      value.exitCode <= 255),
);
assert.equal(typeof value.invalidEvidence, "boolean");
assert.ok(Array.isArray(value.records) && value.records.length <= 3);
for (const record of value.records) validateRecord(record);
if (value.failure !== null) {
  assert.deepEqual(Object.keys(value.failure).sort(), ["osCode", "stage"]);
  assert.match(value.failure.stage, /^[a-z-]{1,64}$/);
  assert.ok(
    Number.isInteger(value.failure.osCode) &&
      value.failure.osCode >= 0 &&
      value.failure.osCode <= 0xffffffff,
  );
}
if (value.summary !== null)
  assert.deepEqual(validateRecords(value.records, platform), value.summary);
const passed =
  value.exitCode === 0 &&
  !value.invalidEvidence &&
  value.failure === null &&
  value.summary !== null;
console.log(
  JSON.stringify({
    platform,
    sourceHead: value.sourceHead,
    sourceTree: value.sourceTree,
    passed,
    actors: value.summary?.actors ?? 0,
    unavailableFixtures: value.summary?.unavailableFixtures ?? null,
    unresolvedFactCount: value.summary?.unprovedFacts.length ?? null,
    admitted: false,
    filesystemQualified: false,
  }),
);
if (!passed) process.exitCode = 1;
