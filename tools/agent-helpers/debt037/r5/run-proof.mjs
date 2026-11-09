/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Rights Actor Proof
 * 📄 File: tools/agent-helpers/debt037/r5/run-proof.mjs
 * 🎯 Purpose: Admits disposable CI and preserves bounded real-process evidence.
 * 🧠 Responsibilities: Invokes platform controllers with the pinned runtime and validates records.
 * 🏗️ Architecture: Ad hoc CI helper; never loaded by API or Worker.
 * ⚠️ Important: Refuses developer execution before any privileged controller invocation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  process.env.DSS_RIGHTS_ACTOR_PROOF !== "1" ||
  !["win32", "linux", "darwin"].includes(process.platform)
)
  throw new Error("Requires opted-in disposable hosted CI.");
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
assert.equal(
  process.versions.node,
  readFileSync(resolve(root, ".node-version"), "utf8").trim(),
);
const binary = resolve(
  root,
  "packages/storage/native-probe/build/Release/dss_storage_probe.node",
);
const fixture = resolve(
  root,
  "packages/storage/native-probe/build/Release/dss_rights_native_test",
);
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
      "-BinaryPath",
      binary,
    ],
    {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
} else {
  assert.notEqual(process.getuid(), 0);
  assert.notEqual(process.getgid(), 0);
  assert.ok(process.env.PYTHON && process.env.PYTHON.startsWith("/"));
  child = spawnSync(
    "sudo",
    [
      "-n",
      "--preserve-env=GITHUB_ACTIONS,RUNNER_ENVIRONMENT,DSS_RIGHTS_ACTOR_PROOF",
      process.env.PYTHON,
      resolve(here, "posix-controller.py"),
      process.execPath,
      binary,
      fixture,
      String(process.getuid()),
      String(process.getgid()),
    ],
    { encoding: "utf8", shell: false, maxBuffer: 2 * 1024 * 1024 },
  );
}
const records = [];
const diagnosticText = (child.stderr ?? "").replace(/\x1b\[[0-9;]*m/g, "");
const windowsFailure = diagnosticText.match(
  /DSS_R5_FAILURE stage=([a-z-]{1,80}) code=([0-9]{1,10})/,
);
const posixFailure = diagnosticText.match(
  /failed at ([a-z-]{1,80}) \([A-Za-z]+, errno=(None|[0-9]{1,10})\)/,
);
const actorFailure = diagnosticText.match(
  /Actor check failed: ([a-z/-]{1,48})/,
);
const failure =
  child.status === 0
    ? null
    : {
        stage:
          windowsFailure?.[1] ??
          posixFailure?.[1] ??
          actorFailure?.[1] ??
          "unclassified-controller-failure",
        osCode: windowsFailure
          ? Number(windowsFailure[2])
          : posixFailure && posixFailure[2] !== "None"
            ? Number(posixFailure[2])
            : null,
      };
for (const line of (child.stdout ?? "").split(/\r?\n/).filter(Boolean)) {
  const item = JSON.parse(line);
  assert.deepEqual(Object.keys(item).sort(), [
    "actor",
    "checks",
    "identityChecked",
    "kind",
  ]);
  assert.equal(item.kind, "result");
  assert.ok(["service", "attacker"].includes(item.actor));
  assert.equal(item.identityChecked, true);
  const expected =
    item.actor === "service"
      ? [
          "usableProtected",
          "usablePrivate",
          "sharedCreationModel",
          "foreignOwner",
          "dangerousAllow",
          "inheritedGrant",
          "serviceDenial",
          "parentDeletion",
          ...(process.platform !== "linux" ? ["noDenyCredit"] : []),
          ...(process.platform === "win32" ? ["emptyVsNull"] : []),
        ]
      : [
          "sharedCreation",
          "protectedDenial",
          "privateDenial",
          "allowPositive",
          ...(process.platform !== "linux" ? ["denyKernelControl"] : []),
        ];
  assert.deepEqual(Object.keys(item.checks).sort(), expected.sort());
  assert.ok(Object.values(item.checks).every((value) => value === true));
  records.push(item);
}
const destination = resolve(
  root,
  "node_modules/.cache",
  `rights-actor-${process.platform}.json`,
);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(
  destination,
  JSON.stringify(
    {
      kind: "rights-actor-proof",
      platform: process.platform,
      node: process.version,
      exitCode: child.status,
      admitted: false,
      records,
      failure,
    },
    null,
    2,
  ) + "\n",
);
assert.equal(
  child.status,
  0,
  `Controller failed at ${failure?.stage}; OS code ${failure?.osCode}`,
);
assert.equal(records.length, 2);
assert.equal(new Set(records.map((item) => item.actor)).size, 2);
console.log(
  JSON.stringify({
    platform: process.platform,
    actors: records.length,
    controls: records.reduce(
      (count, item) => count + Object.keys(item.checks).length,
      0,
    ),
    admitted: false,
  }),
);
