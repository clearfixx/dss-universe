/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Qualification Proof Verification
 * 📄 File: packages/storage/native-probe/qualification.test.cjs
 * 🎯 Purpose: Verifies the standalone probe without privileged developer-host changes.
 * 🧠 Responsibilities: Checks actual observations, explicit unknowns and fixed CLI controls.
 * 🏗️ Architecture: Native test runner; synthetic workspace fixtures only.
 * ⚠️ Important: No admission assertion, actor provisioning or filesystem qualification.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, realpathSync } = require("node:fs");
const { join, resolve } = require("node:path");
const test = require("node:test");
const executable = join(
  __dirname,
  "build/Release",
  `dss_qualification_proof${process.platform === "win32" ? ".exe" : ""}`,
);
const fields = [
  "remoteDevice",
  "removableMedia",
  "ownershipIgnored",
  "snapshot",
  "readOnly",
  "idmapped",
  "mountBound",
  "namespaceContextStable",
];
function run(args, environment = process.env) {
  const child = spawnSync(executable, args, {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 8192,
    env: environment,
  });
  assert.equal(child.signal, null);
  assert.equal(child.error, undefined);
  return child;
}
function fixture() {
  const cache = resolve(__dirname, "../../../node_modules/.cache");
  mkdirSync(cache, { recursive: true });
  const arena = realpathSync(mkdtempSync(join(cache, "qualification-native-")));
  for (const name of ["left", "right"])
    mkdirSync(join(arena, name), { mode: 0o700 });
  return arena;
}
function inspect(left, right) {
  const child = run(["--inspect", left, right]);
  assert.equal(child.status, 0, child.stderr);
  const value = JSON.parse(child.stdout);
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      ...fields,
      "kind",
      "admitted",
      "filesystemQualified",
      "atomic",
      "credentialContextStable",
      "linuxBuildFeatures",
      "family",
      "sameObject",
      "sameDevice",
      "sameFilesystem",
      "sameMount",
      "heldAcrossBarrier",
      "hostIdentityQualified",
      "operationQualified",
    ].sort(),
  );
  assert.equal(value.kind, "qualification-evidence");
  for (const key of [
    "admitted",
    "filesystemQualified",
    "atomic",
    "hostIdentityQualified",
    "operationQualified",
  ])
    assert.equal(value[key], false);
  assert.equal(value.credentialContextStable, true);
  assert.ok(
    Number.isInteger(value.linuxBuildFeatures) &&
      value.linuxBuildFeatures >= 0 &&
      value.linuxBuildFeatures <= 15,
  );
  assert.match(
    value.family,
    /^(unknown|ntfs|refs|ext|xfs|btrfs|tmpfs|overlay|apfs|hfs|other)$/,
  );
  for (const key of fields) {
    const fact = value[key];
    assert.deepEqual(Object.keys(fact).sort(), ["osCode", "state", "value"]);
    assert.ok(["present", "unavailable", "unsupported"].includes(fact.state));
    assert.ok(
      Number.isInteger(fact.osCode) &&
        fact.osCode >= 0 &&
        fact.osCode <= 0xffffffff,
    );
    if (fact.state === "present") {
      assert.equal(typeof fact.value, "boolean");
      assert.equal(fact.osCode, 0);
    } else assert.equal(fact.value, null);
  }
  assert.ok(Buffer.byteLength(child.stdout) <= 4096);
  assert.equal(child.stdout.includes(left), false);
  assert.equal(child.stdout.includes(right), false);
  return value;
}
test("standalone decoder negatives and genuine OS/context controls are distinct", () => {
  const child = run(["--unit"]);
  assert.equal(child.status, 0, child.stderr);
  const value = JSON.parse(child.stdout);
  assert.equal(value.kind, "qualification-unit-controls");
  assert.equal(typeof value.decoderNegatives, "boolean"); // false explicitly records a compile-time unsupported decoder.
  assert.equal(value.genuineOsError, true);
  assert.equal(value.workerContext, true);
  assert.equal(value.admitted, false);
});
test("held-object comparisons preserve identical versus distinct object facts", () => {
  const arena = fixture(),
    left = join(arena, "left"),
    right = join(arena, "right");
  const same = inspect(left, left),
    distinct = inspect(left, right);
  assert.equal(same.sameObject, true);
  assert.equal(distinct.sameObject, false);
  assert.equal(same.sameFilesystem, true);
  assert.equal(distinct.sameFilesystem, true);
  if (process.platform === "win32" || process.platform === "darwin")
    assert.equal(same.sameMount, null);
  assert.equal(same.readOnly.state, "present");
});
test("missing resources and malformed CLI fail without publishing paths or admission", () => {
  const arena = fixture();
  for (const args of [
    [],
    ["--unknown"],
    ["--inspect", join(arena, "missing"), arena],
    ["--inspect", arena],
  ]) {
    const child = run(args);
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.equal(child.stderr.includes(arena), false);
    assert.equal(JSON.parse(child.stderr).kind, "qualification-failure");
  }
});
test("developer invocation cannot enter the ordinary-actor proof mode", () => {
  const arena = fixture();
  const env = {
    ...process.env,
    GITHUB_ACTIONS: "false",
    RUNNER_ENVIRONMENT: "developer",
    DSS_RIGHTS_ACTOR_PROOF: "0",
  };
  for (const mode of ["--actor", "--hold"]) {
    const child = run([mode, arena, arena], env);
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.equal(JSON.parse(child.stderr).kind, "qualification-failure");
  }
});
test("evidence validator refuses leaked fields, false certification and unknown-as-false", async () => {
  const { validateEvidence, validateRecord, validateRecords } =
    await import("../../../tools/agent-helpers/debt037/r6/evidence-policy.mjs");
  const arena = fixture();
  const value = inspect(join(arena, "left"), join(arena, "left"));
  validateEvidence(value);
  const leaked = structuredClone(value);
  leaked.rawId = "synthetic";
  assert.throws(() => validateEvidence(leaked));
  const admitted = structuredClone(value);
  admitted.admitted = true;
  assert.throws(() => validateEvidence(admitted));
  const guessed = structuredClone(value);
  guessed.idmapped = { state: "unsupported", value: false, osCode: 0 };
  assert.throws(() => validateEvidence(guessed));
  validateRecord({ kind: "fixture-evidence", controls: [] });
  validateRecord({
    kind: "fixture-evidence",
    controls: [
      {
        name: "unattempted",
        state: "unsupported",
        value: null,
        toolExitCode: null,
      },
    ],
  });
  assert.throws(() =>
    validateRecord({
      kind: "fixture-evidence",
      controls: [
        { name: "unattempted", state: "unsupported", value: null, osCode: 50 },
      ],
    }),
  );
  assert.throws(() => validateRecords([]));
  const child = spawnSync(
    process.execPath,
    [
      resolve(
        __dirname,
        "../../../tools/agent-helpers/debt037/r6/run-proof.mjs",
      ),
    ],
    {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        GITHUB_ACTIONS: "false",
        RUNNER_ENVIRONMENT: "developer",
        DSS_QUALIFICATION_PROOF: "0",
      },
    },
  );
  assert.equal(child.status, 1);
  assert.equal(child.stdout, "");
  assert.match(child.stderr, /Requires opted-in disposable hosted CI/);
});
