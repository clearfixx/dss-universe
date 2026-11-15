/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/run-proof.mjs
 * 🎯 Purpose: Admits hosted CI and preserves bounded proof and unresolved gates.
 * 🧠 Responsibilities: Launches guarded platform controllers and validates every evidence field.
 * 🏗️ Architecture: Ad hoc CI helper; never part of API/Worker startup.
 * ⚠️ Important: Refuses developer provisioning; no error or unavailable fact becomes qualification.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRecord, validateRecords } from "./evidence-policy.mjs";
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  process.env.DSS_QUALIFICATION_PROOF !== "1" ||
  !["win32", "linux", "darwin"].includes(process.platform)
)
  throw new Error("Requires opted-in disposable hosted CI.");
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, "../../../..");
assert.equal(
  process.versions.node,
  readFileSync(resolve(root, ".node-version"), "utf8").trim(),
);
const executable = resolve(
  root,
  "packages/storage/native-probe/build/Release",
  `dss_qualification_proof${process.platform === "win32" ? ".exe" : ""}`,
);
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
}).trim();
const sourceTree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
}).trim();
assert.match(sourceHead, /^[a-f0-9]{40}$/);
assert.match(sourceTree, /^[a-f0-9]{40}$/);
const binarySha256 = createHash("sha256")
  .update(readFileSync(executable))
  .digest("hex");
let child;
if (process.platform === "win32") {
  child = spawnSync(
    "pwsh",
    [
      "-NoProfile",
      "-File",
      resolve(here, "windows-controller.ps1"),
      "-NodePath",
      process.execPath,
      "-ProbePath",
      executable,
    ],
    { encoding: "utf8", shell: false, windowsHide: true, maxBuffer: 262144 },
  );
} else {
  assert.notEqual(process.getuid(), 0);
  assert.notEqual(process.getgid(), 0);
  assert.ok(process.env.PYTHON?.startsWith("/"));
  child = spawnSync(
    "sudo",
    [
      "-n",
      "--preserve-env=GITHUB_ACTIONS,RUNNER_ENVIRONMENT,DSS_QUALIFICATION_PROOF",
      process.env.PYTHON,
      resolve(here, "posix-controller.py"),
      process.execPath,
      executable,
      String(process.getuid()),
      String(process.getgid()),
    ],
    { encoding: "utf8", shell: false, maxBuffer: 262144 },
  );
}
const records = [];
let summary = null,
  invalidEvidence = false;
try {
  for (const line of (child.stdout ?? "").split(/\r?\n/).filter(Boolean)) {
    assert.ok(Buffer.byteLength(line) <= 65536);
    const record = JSON.parse(line);
    validateRecord(record);
    records.push(record);
    assert.ok(records.length <= 3);
  }
  summary = validateRecords(records);
} catch {
  invalidEvidence = true;
} // Retain already validated partial evidence on failure.
const failure = (child.stderr ?? "").match(
  /DSS_R6_FAILURE stage=([a-z-]{1,64}) code=([0-9]{1,10})/,
);
const boundedFailure = failure
  ? { stage: failure[1], osCode: Number(failure[2]) }
  : null;
if (boundedFailure) assert.ok(boundedFailure.osCode <= 0xffffffff);
const destination = resolve(
  root,
  "node_modules/.cache",
  `qualification-proof-${process.platform}.json`,
);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(
  destination,
  JSON.stringify(
    {
      kind: "qualification-proof",
      sourceHead,
      sourceTree,
      binarySha256,
      platform: process.platform,
      node: process.version,
      exitCode: child.status,
      admitted: false,
      filesystemQualified: false,
      records,
      summary,
      invalidEvidence,
      failure: boundedFailure,
    },
    null,
    2,
  ) + "\n",
);
assert.equal(child.error, undefined);
assert.equal(child.status, 0, `Controller failed at ${boundedFailure?.stage}`);
assert.equal(invalidEvidence, false, "Unbounded/incomplete evidence refused.");
console.log(
  JSON.stringify({
    platform: process.platform,
    ...summary,
    admitted: false,
    filesystemQualified: false,
  }),
);
