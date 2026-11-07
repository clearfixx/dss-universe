/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Rights Verification
 * 📄 File: packages/storage/native-probe/rights.test.cjs
 * 🎯 Purpose: Verifies typed rights diagnostics, fresh metadata and retained lifetimes.
 * 🧠 Responsibilities: Uses real local fixtures; separates ordinary checks from privileged CI proof.
 * 🏗️ Architecture: Private addon tests without application services or public exports.
 * ⚠️ Important: No local account creation, recursive fixture deletion or activation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { once } = require("node:events");
const { Worker } = require("node:worker_threads");
const { mkdtempSync, realpathSync, mkdirSync, chmodSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const probe = require("./build/Release/dss_storage_probe.node");
const executable = join(
  __dirname,
  "build",
  "Release",
  `dss_rights_native_test${process.platform === "win32" ? ".exe" : ""}`,
);
const roles = [
  "ancestor",
  "shared-namespace",
  "protected-parent",
  "private-control",
];
function fixture() {
  const arena = realpathSync(mkdtempSync(join(tmpdir(), "dss-rights-r5-")));
  const target = join(arena, "owned");
  mkdirSync(target, { mode: 0o700 });
  return target;
}
function bounded(value) {
  assert.deepEqual(Object.keys(value).sort(), [
    "admitted",
    "atomic",
    "components",
    "filesystemQualified",
    "kind",
    "qualificationsRequired",
    "ruleset",
  ]);
  assert.equal(value.kind, "role-rights-evidence");
  assert.equal(value.ruleset, "directory-owner-rights-v1");
  assert.equal(value.admitted, false);
  assert.equal(value.atomic, false);
  assert.equal(value.filesystemQualified, false);
  assert.deepEqual(value.qualificationsRequired, [
    "identity-domain",
    "filesystem-and-transition",
    "creation-protocol",
    "hostile-operations",
  ]);
  assert.ok(value.components.length > 1 && value.components.length <= 1024);
  for (const component of value.components) {
    assert.deepEqual(Object.keys(component).sort(), [
      "aclMetadata",
      "grantModel",
      "inheritanceModel",
      "owner",
      "ownerClass",
      "parentModel",
      "role",
      "serviceAccess",
    ]);
    assert.ok(roles.includes(component.role));
    assert.ok(
      ["service", "os-administrator-candidate", "other", "unknown"].includes(
        component.ownerClass,
      ),
    );
    for (const name of [
      "owner",
      "serviceAccess",
      "aclMetadata",
      "grantModel",
      "inheritanceModel",
      "parentModel",
    ]) {
      assert.deepEqual(Object.keys(component[name]).sort(), [
        "osCode",
        "reason",
        "state",
      ]);
      assert.ok(
        ["satisfied", "violated", "unavailable", "unsupported"].includes(
          component[name].state,
        ),
      );
      assert.match(component[name].reason, /^[a-z-]{1,80}$/);
      assert.ok(
        Number.isInteger(component[name].osCode) && component[name].osCode >= 0,
      );
    }
  }
}
test("native model negatives and real context/query-error controls pass independently", () => {
  const result = JSON.parse(
    execFileSync(executable, [], { encoding: "utf8", windowsHide: true }),
  );
  assert.deepEqual(result, {
    modelControls: true,
    osErrorControl: true,
    contextControls: true,
  });
});
test("all four fixed roles produce bounded non-admission evidence from actual objects", async () => {
  const target = fixture();
  const chain = await probe.captureSecurityChain(target);
  try {
    const actualOwner = (await probe.inspectSecurityChain(chain)).components.at(
      -1,
    );
    let ownerClass = actualOwner.ownerMatchesProcess
      ? "service"
      : actualOwner.ownerIsSystem
        ? "os-administrator-candidate"
        : "other";
    if (process.platform === "win32") {
      // Elevated Windows can choose Administrators as a new object's default
      // owner. Query the fixture independently instead of weakening the policy.
      ownerClass = execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          '$current=[Security.Principal.WindowsIdentity]::GetCurrent(); try { $owner=([IO.Directory]::GetAccessControl($env:DSS_R5_FIXTURE)).GetOwner([Security.Principal.SecurityIdentifier]).Value; if ($owner -eq $current.User.Value) { "service" } elseif ($owner -in @("S-1-5-18","S-1-5-32-544")) { "os-administrator-candidate" } else { "other" } } finally { $current.Dispose() }',
        ],
        {
          encoding: "utf8",
          windowsHide: true,
          env: { ...process.env, DSS_R5_FIXTURE: target },
        },
      ).trim();
      assert.ok(
        ["service", "os-administrator-candidate", "other"].includes(ownerClass),
      );
    }
    for (const role of roles) {
      const value = await probe.inspectRoleRights(chain, role);
      bounded(value);
      assert.equal(value.components.at(-1).role, role);
      assert.equal(value.components.at(-1).ownerClass, ownerClass);
      assert.equal(
        value.components.at(-1).owner.state,
        ownerClass === "service" ||
          (role === "ancestor" && ownerClass === "os-administrator-candidate")
          ? "satisfied"
          : "violated",
      );
      assert.equal(value.components.at(-1).serviceAccess.state, "satisfied");
      assert.ok(
        value.components.slice(0, -1).every((item) => item.role === "ancestor"),
      );
      assert.ok(!JSON.stringify(value).includes(target));
    }
  } finally {
    probe.close(chain);
  }
});
test("wrong kinds, forged capabilities, caller trust flags and arbitrary masks reject", async () => {
  const target = fixture();
  const ordinary = await probe.captureRootChain(target);
  const root = await probe.openRoot(target);
  const chain = await probe.captureSecurityChain(target);
  try {
    for (const args of [
      [{}, "ancestor"],
      [root, "ancestor"],
      [ordinary, "ancestor"],
      [chain, "admin"],
      [chain, "ancestor\0private-control"],
      [chain, 7],
      [chain, "ancestor", true],
      [chain],
    ]) {
      assert.throws(
        () => probe.inspectRoleRights(...args),
        (error) => /^ERR_STORAGE_NATIVE_/.test(error.code),
      );
    }
  } finally {
    probe.close(ordinary);
    probe.close(root);
    probe.close(chain);
  }
});
test("accepted inspection owns chain until completion; closure is idempotent", async () => {
  const chain = await probe.captureSecurityChain(fixture());
  const pending = Array.from({ length: 24 }, () =>
    probe.inspectRoleRights(chain, "private-control"),
  );
  probe.close(chain);
  probe.close(chain);
  for (const value of await Promise.all(pending)) bounded(value);
  assert.throws(() => probe.inspectRoleRights(chain, "ancestor"), {
    code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
  });
});
test("repeated inspection refreshes actual mode/ACL metadata without cross-call cache", async () => {
  const target = fixture();
  const chain = await probe.captureSecurityChain(target);
  try {
    if (process.platform !== "win32") {
      execFileSync(
        executable,
        ["fixture", target, "safe", String(process.getuid())],
        { windowsHide: true },
      );
      const before = await probe.inspectRoleRights(chain, "private-control");
      assert.equal(before.components.at(-1).grantModel.state, "satisfied");
      chmodSync(target, 0o777);
      const after = await probe.inspectRoleRights(chain, "private-control");
      assert.equal(after.components.at(-1).grantModel.state, "violated");
    } else {
      const before = await probe.inspectRoleRights(chain, "private-control");
      const after = await probe.inspectRoleRights(chain, "private-control");
      bounded(before);
      bounded(after);
      assert.deepEqual(after, before);
    }
  } finally {
    probe.close(chain);
  }
});
test("R5 queued context resources survive worker teardown without exporting handles", async () => {
  const binary = join(__dirname, "build/Release/dss_storage_probe.node");
  const target = fixture();
  const worker = new Worker(
    `
    const {parentPort,workerData}=require('node:worker_threads');
    const p=require(workerData.binary);
    p.captureSecurityChain(workerData.target).then(c=>{
      const pending=Array.from({length:24},()=>p.inspectRoleRights(c,'private-control'));
      p.close(c);
      parentPort.postMessage('accepted');
      Promise.all(pending).then(()=>parentPort.postMessage('settled'));
    });`,
    { eval: true, workerData: { binary, target } },
  );
  const [message] = await once(worker, "message");
  assert.equal(message, "accepted");
  assert.ok(Number.isInteger(await worker.terminate()));
  const subsequent = await probe.captureSecurityChain(target);
  try {
    bounded(await probe.inspectRoleRights(subsequent, "private-control"));
  } finally {
    probe.close(subsequent);
  }
});
test("privileged actor harness refuses a developer invocation before controller execution", () => {
  const result = spawnSync(
    process.execPath,
    [join(__dirname, "../../../tools/agent-helpers/debt037/r5/run-proof.mjs")],
    {
      env: {
        ...process.env,
        GITHUB_ACTIONS: "false",
        DSS_RIGHTS_ACTOR_PROOF: "0",
      },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Requires opted-in disposable hosted CI/);
});
