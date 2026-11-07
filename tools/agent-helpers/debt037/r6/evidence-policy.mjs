/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/evidence-policy.mjs
 * 🎯 Purpose: Refuses unbounded or falsely qualified native/actor evidence.
 * 🧠 Responsibilities: Validates fixed fields and ties observations to actual provisioned controls.
 * 🏗️ Architecture: Test-only evidence validator; no production filesystem policy.
 * ⚠️ Important: Unavailable control evidence is retained and never certified as a pass.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
const factKeys = [
  "remoteDevice",
  "removableMedia",
  "ownershipIgnored",
  "snapshot",
  "readOnly",
  "idmapped",
  "mountBound",
  "namespaceContextStable",
];
function keys(value, expected) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
}
function code(value) {
  assert.ok(Number.isInteger(value) && value >= 0 && value <= 0xffffffff);
}
function fact(value) {
  keys(value, ["state", "value", "osCode"]);
  code(value.osCode);
  assert.ok(["present", "unavailable", "unsupported"].includes(value.state));
  if (value.state === "present") {
    assert.equal(typeof value.value, "boolean");
    assert.equal(value.osCode, 0);
  } else assert.equal(value.value, null);
}
function control(value) {
  keys(value, ["name", "state", "value", "toolExitCode"]);
  assert.match(value.name, /^[a-z-]{1,64}$/);
  assert.ok(
    value.toolExitCode === null ||
      (Number.isInteger(value.toolExitCode) &&
        value.toolExitCode >= 0 &&
        value.toolExitCode <= 255),
  );
  fact({ state: value.state, value: value.value, osCode: 0 });
}
export function validateEvidence(value) {
  keys(value, [
    ...factKeys,
    "kind",
    "admitted",
    "filesystemQualified",
    "atomic",
    "credentialContextStable",
    "family",
    "sameObject",
    "sameDevice",
    "sameFilesystem",
    "sameMount",
    "heldAcrossBarrier",
    "hostIdentityQualified",
    "operationQualified",
  ]);
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
  assert.equal(typeof value.heldAcrossBarrier, "boolean");
  assert.match(
    value.family,
    /^(unknown|ntfs|refs|ext|xfs|btrfs|tmpfs|overlay|apfs|hfs|other)$/,
  );
  for (const key of factKeys) fact(value[key]);
  for (const key of ["sameObject", "sameDevice", "sameFilesystem", "sameMount"])
    assert.ok(value[key] === null || typeof value[key] === "boolean");
}
export function validateRecord(record) {
  if (record.kind === "fixture-evidence") {
    keys(record, ["kind", "controls"]);
    assert.ok(Array.isArray(record.controls) && record.controls.length <= 16);
    for (const value of record.controls) {
      control(value);
    }
    return;
  }
  keys(record, ["kind", "actor", "identityChecked", "records"]);
  assert.equal(record.kind, "result");
  assert.ok(["service", "attacker"].includes(record.actor));
  assert.equal(record.identityChecked, true);
  assert.ok(Array.isArray(record.records) && record.records.length <= 16);
  for (const value of record.records) {
    assert.match(value.stage, /^[a-z-]{1,64}$/);
    if ("evidence" in value) {
      keys(value, ["stage", "evidence"]);
      validateEvidence(value.evidence);
    } else if ("checked" in value) {
      keys(value, ["stage", "checked"]);
      assert.equal(value.checked, true);
    } else {
      keys(value, ["stage", "allowed"]);
      assert.equal(typeof value.allowed, "boolean");
    }
  }
}
export function validateRecords(records, platform = process.platform) {
  assert.ok(Array.isArray(records) && records.length === 3);
  const fixture = records.find((value) => value.kind === "fixture-evidence");
  keys(fixture, ["kind", "controls"]);
  assert.ok(Array.isArray(fixture.controls) && fixture.controls.length <= 16);
  const controls = new Map();
  for (const value of fixture.controls) {
    control(value);
    assert.ok(!controls.has(value.name));
    controls.set(value.name, value);
  }
  const requiredControls =
    platform === "win32"
      ? ["ordinary-primary-tokens", "remote-fixture", "removable-fixture"]
      : platform === "linux"
        ? [
            "isolated-namespace",
            "separate-fixture",
            "bind-fixture",
            "idmapped-fixture",
          ]
        : platform === "darwin"
          ? ["ownership-on-fixture", "ownership-off-fixture"]
          : null;
  assert.ok(requiredControls);
  assert.deepEqual(
    [...controls.keys()].sort(),
    [
      ...requiredControls,
      ...(platform === "linux" &&
      controls.get("idmapped-fixture")?.value === true
        ? ["mapped-owner-distinguished"]
        : []),
    ].sort(),
  );
  for (const value of controls.values())
    if (value.state === "present") assert.equal(value.value, true);
  if (platform === "linux")
    assert.equal(controls.get("isolated-namespace").value, true);
  if (platform === "win32")
    assert.equal(controls.get("ordinary-primary-tokens").value, true);
  const actors = records.filter((value) => value.kind === "result");
  assert.equal(actors.length, 2);
  assert.equal(new Set(actors.map((value) => value.actor)).size, 2);
  for (const actor of actors) {
    keys(actor, ["kind", "actor", "identityChecked", "records"]);
    assert.ok(["service", "attacker"].includes(actor.actor));
    assert.equal(actor.identityChecked, true);
    assert.ok(
      Array.isArray(actor.records) &&
        actor.records.length > 0 &&
        actor.records.length <= 16,
    );
    const stages = new Set();
    for (const record of actor.records) {
      assert.match(record.stage, /^[a-z-]{1,64}$/);
      assert.ok(!stages.has(record.stage));
      stages.add(record.stage);
      if ("evidence" in record) {
        keys(record, ["stage", "evidence"]);
        validateEvidence(record.evidence);
      } else if ("checked" in record) {
        keys(record, ["stage", "checked"]);
        assert.equal(record.checked, true);
      } else {
        keys(record, ["stage", "allowed"]);
        assert.equal(typeof record.allowed, "boolean");
      }
    }
  }
  const service = actors.find((value) => value.actor === "service").records;
  const stage = (name) => service.find((value) => value.stage === name);
  assert.equal(stage("same-object")?.evidence.sameObject, true);
  assert.equal(stage("different-object")?.evidence.sameObject, false);
  assert.equal(
    stage("held-parent-after-transition")?.evidence.heldAcrossBarrier,
    true,
  );
  assert.equal(stage("nofollow-transition-refused")?.checked, true);
  assert.equal(stage("service-creation")?.checked, true);
  assert.ok(stage("normal")?.evidence);
  const attacker = actors.find((value) => value.actor === "attacker").records;
  assert.equal(
    attacker.find((value) => value.stage === "shared-creation")?.checked,
    true,
  );
  // Assert known query values against independently provisioned fixtures; preserve missing facts as unproved.
  for (const [name, field, expected] of [
    ["idmapped", "idmapped", true],
    ["ownership-on", "ownershipIgnored", false],
    ["ownership-off", "ownershipIgnored", true],
  ]) {
    if (controls.get(name + "-fixture")?.value !== true) continue;
    const value = stage(name)?.evidence;
    assert.ok(value);
    if (value[field].state === "present")
      assert.equal(value[field].value, expected);
  }
  const on = attacker.find(
    (value) => value.stage === "ownership-on-actual-creation",
  );
  if (on) assert.equal(on.allowed, false);
  if (controls.get("separate-fixture")?.value === true)
    assert.equal(stage("separate")?.evidence.sameFilesystem, false);
  for (const name of ["bind", "idmapped"]) {
    if (controls.get(name + "-fixture")?.value !== true) continue;
    assert.equal(stage(name)?.evidence.sameObject, true);
    if (stage(name).evidence.sameMount !== null)
      assert.equal(stage(name).evidence.sameMount, false);
  }
  const bind = stage("bind")?.evidence,
    normal = stage("normal")?.evidence;
  if (
    bind?.idmapped.state === "present" &&
    normal?.idmapped.state === "present"
  )
    assert.equal(bind.idmapped.value, normal.idmapped.value);
  for (const value of service) {
    if (value.evidence?.namespaceContextStable.state === "present")
      assert.equal(value.evidence.namespaceContextStable.value, true);
  }
  return {
    fixtureControls: fixture.controls.length,
    actors: actors.length,
    unavailableFixtures: fixture.controls
      .filter((value) => value.state !== "present")
      .map((value) => value.name),
    unprovedFacts: service
      .filter((value) => value.evidence)
      .flatMap((value) =>
        factKeys
          .filter((key) => value.evidence[key].state !== "present")
          .map((key) => value.stage + "/" + key),
      ),
  };
}
