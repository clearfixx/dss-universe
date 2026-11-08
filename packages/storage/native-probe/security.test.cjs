/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Security Evidence
 * 📄 File: packages/storage/native-probe/security.test.cjs
 * 🎯 Purpose: Verifies real owner/mode/ACL observations and privacy boundaries.
 * 🧠 Responsibilities: Uses actual OS controls, typed capabilities and lifecycle checks.
 * 🏗️ Architecture: Mandatory native tests; no mocked ACL readers or application imports.
 * ⚠️ Important: Only fresh synthetic fixtures are mutated; admission stays false.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { once } = require("node:events");
const {
  chmodSync,
  fstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  symlinkSync,
} = require("node:fs");
const { constants, tmpdir } = require("node:os");
const { isAbsolute, join, resolve } = require("node:path");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { Worker } = require("node:worker_threads");
const test = require("node:test");
const binary = join(__dirname, "build", "Release", "dss_storage_probe.node");
const probe = require(binary);
const helpers = resolve(__dirname, "../../../tools/agent-helpers/debt037");
const states = ["present", "verified-absent", "unavailable", "unsupported"];
const nativeError = (error) => /^ERR_STORAGE_NATIVE_/.test(error.code);

function fixture() {
  const arena = realpathSync(mkdtempSync(join(tmpdir(), "dss-native-r2-")));
  const leaf = join(arena, "entries");
  mkdirSync(leaf, { mode: 0o700 });
  return { arena, leaf };
}
const last = async (chain) =>
  (await probe.inspectSecurityChain(chain)).components.at(-1);
function python() {
  const text = readFileSync(join(__dirname, "build", "config.gypi"), "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const executable = JSON.parse(text).variables?.python;
  assert.equal(typeof executable, "string");
  assert.ok(
    isAbsolute(executable),
    "Use the actual native-build interpreter, never an arbitrary Python fallback",
  );
  return executable;
}
function aclCommand(arena, mode = "entries", enabled = "1") {
  const env = { ...process.env, DSS_NATIVE_SECURITY_FIXTURE: enabled };
  return process.platform === "win32"
    ? {
        executable: "pwsh",
        args: [
          "-NoProfile",
          "-File",
          join(helpers, "windows-acl-fixture.ps1"),
          "-Arena",
          arena,
          "-Mode",
          mode,
        ],
        env,
      }
    : {
        executable: python(),
        args: [join(helpers, "posix-acl-fixture.py"), arena],
        env,
      };
}
function applyAcl(arena, mode) {
  const command = aclCommand(arena, mode);
  execFileSync(command.executable, command.args, {
    env: command.env,
    encoding: "utf8",
    windowsHide: true,
  });
}
function assertAclShape(acl) {
  assert.deepEqual(Object.keys(acl).sort(), [
    "entries",
    "format",
    "inheritanceObserved",
    "osCode",
    "shape",
    "state",
    "unknownEntryTypes",
  ]);
  assert.ok(states.includes(acl.state));
  if (acl.state === "unavailable" || acl.state === "unsupported") {
    assert.equal(acl.entries, null);
    assert.equal(acl.unknownEntryTypes, null);
    assert.equal(acl.inheritanceObserved, null);
  } else assert.ok(Number.isInteger(acl.entries) && acl.entries >= 0);
}

test("R2 projects bounded descriptor-bound facts without identities, paths or ACL bytes", async () => {
  const paths = fixture();
  const chain = await probe.captureSecurityChain(paths.leaf);
  try {
    const evidence = await probe.inspectSecurityChain(chain);
    assert.deepEqual(Object.keys(evidence).sort(), [
      "admitted",
      "components",
      "effectiveAccessEvaluated",
      "kind",
    ]);
    assert.equal(evidence.kind, "security-evidence");
    assert.equal(evidence.admitted, false);
    assert.equal(evidence.effectiveAccessEvaluated, false);
    assert.equal(
      evidence.components.length,
      (await probe.inspectChain(chain)).components,
    );
    assert.deepEqual(Object.getOwnPropertyNames(chain), []);
    for (const facts of evidence.components) {
      assert.deepEqual(Object.keys(facts).sort(), [
        "acl",
        "defaultAcl",
        "mode",
        "ownerIsSystem",
        "ownerMatchesProcess",
      ]);
      assert.ok([true, false, null].includes(facts.ownerMatchesProcess));
      assert.ok([true, false, null].includes(facts.ownerIsSystem));
      assertAclShape(facts.acl);
      if (facts.defaultAcl !== null) assertAclShape(facts.defaultAcl);
    }
    const leaf = evidence.components.at(-1);
    assert.equal(typeof leaf.ownerMatchesProcess, "boolean");
    if (process.platform !== "win32")
      assert.equal(leaf.ownerMatchesProcess, true);
    assert.equal(JSON.stringify(evidence).includes(paths.arena), false);
    assert.doesNotMatch(JSON.stringify(evidence), /S-1-\d-/);
  } finally {
    probe.close(chain);
  }
});

test("R2 preserves R1 capability intent and rejects forged, closed and wrong-kind callers", async () => {
  const paths = fixture();
  const r1 = await probe.captureRootChain(paths.leaf);
  const r2 = await probe.captureSecurityChain(paths.leaf);
  const root = await probe.openRoot(paths.leaf);
  try {
    assert.throws(() => probe.inspectSecurityChain(r1), {
      code: "ERR_STORAGE_NATIVE_SECURITY_CAPABILITY",
    });
    assert.throws(() => probe.inspectSecurityChain(root), {
      code: "ERR_STORAGE_NATIVE_CAPABILITY_KIND",
    });
    for (const value of [{}, null, Object.create(r2), new Proxy(r2, {})]) {
      assert.throws(() => probe.inspectSecurityChain(value), {
        code: "ERR_STORAGE_NATIVE_CAPABILITY",
      });
    }
    assert.throws(() => probe.captureSecurityChain(), {
      code: "ERR_STORAGE_NATIVE_ARGUMENTS",
    });
    assert.throws(() => probe.captureSecurityChain(7), {
      code: "ERR_STORAGE_NATIVE_STRING",
    });
    assert.throws(() => probe.inspectSecurityChain(), {
      code: "ERR_STORAGE_NATIVE_ARGUMENTS",
    });
    const inFlight = probe.inspectSecurityChain(r2);
    probe.close(r2);
    probe.close(r2);
    assert.throws(() => probe.inspectSecurityChain(r2), {
      code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
    });
    assert.equal((await inFlight).admitted, false);
    assert.equal((await probe.inspectChain(r1)).admitted, false);
  } finally {
    probe.close(r1);
    probe.close(r2);
    probe.close(root);
  }
});

test("R2 refuses ancestor links and malformed plans without promoting a pathname fallback", async () => {
  const paths = fixture();
  const alias = join(paths.arena, "linked");
  symlinkSync(
    paths.leaf,
    alias,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(probe.captureSecurityChain(alias), nativeError);
  await assert.rejects(
    probe.captureSecurityChain(join(alias, "missing")),
    nativeError,
  );
  await assert.rejects(
    probe.captureSecurityChain(paths.leaf + "/missing/../escape"),
    { code: "ERR_STORAGE_NATIVE_ROOT_PLAN" },
  );
  await assert.rejects(
    probe.captureSecurityChain(join(paths.leaf, "missing")),
    nativeError,
  );
  renameSync(paths.leaf, join(paths.arena, "released-after-refusal"));
});

test("R2 observes explicit native ACL controls, including null versus empty Windows DACL", async () => {
  const paths = fixture();
  if (process.platform === "win32") {
    for (const mode of ["null-dacl", "empty-dacl", "entries"]) {
      const path = join(paths.arena, mode);
      if (mode !== "entries") mkdirSync(path);
      const chain = await probe.captureSecurityChain(path);
      try {
        applyAcl(paths.arena, mode);
        const facts = await last(chain);
        assert.equal(facts.mode, null);
        assert.equal(facts.defaultAcl, null);
        assert.equal(
          facts.acl.state,
          mode === "null-dacl" ? "verified-absent" : "present",
        );
        assert.equal(facts.acl.shape, mode === "entries" ? "entries" : mode);
        assert.equal(facts.acl.entries, mode === "entries" ? 2 : 0);
        assert.equal(facts.acl.osCode, 0);
        assert.equal(facts.acl.unknownEntryTypes, false);
      } finally {
        probe.close(chain);
      }
    }
  } else {
    const chain = await probe.captureSecurityChain(paths.leaf);
    try {
      applyAcl(paths.arena);
      const facts = await last(chain);
      assert.equal(facts.acl.state, "present");
      assert.equal(facts.acl.shape, "entries");
      assert.equal(facts.acl.entries, process.platform === "linux" ? 5 : 1);
      assert.equal(facts.acl.osCode, 0);
      assert.equal(facts.acl.unknownEntryTypes, false);
      if (process.platform === "linux") {
        assert.equal(facts.defaultAcl.state, "present");
        assert.equal(facts.defaultAcl.entries, 5);
        assert.equal(facts.defaultAcl.inheritanceObserved, true);
      } else assert.equal(facts.defaultAcl, null);
    } finally {
      probe.close(chain);
    }
  }
});

test("R2 keeps native mode changes fresh and separate from ACL/effective-access decisions", async () => {
  const paths = fixture();
  const chain = await probe.captureSecurityChain(paths.leaf);
  try {
    if (process.platform === "win32")
      assert.equal((await last(chain)).mode, null);
    else {
      chmodSync(paths.leaf, 0o700);
      assert.deepEqual((await last(chain)).mode, {
        groupWrite: false,
        otherWrite: false,
        sticky: false,
      });
      chmodSync(paths.leaf, 0o1777);
      assert.deepEqual((await last(chain)).mode, {
        groupWrite: true,
        otherWrite: true,
        sticky: true,
      });
    }
    const result = await probe.inspectSecurityChain(chain);
    assert.equal(result.admitted, false);
    assert.equal(result.effectiveAccessEvaluated, false);
  } finally {
    probe.close(chain);
  }
});

test("R2 never converts ambiguous native ACL query errors into verified absence", async () => {
  const paths = fixture();
  const chain = await probe.captureSecurityChain(paths.leaf);
  try {
    const facts = await last(chain);
    assertAclShape(facts.acl);
    console.info(
      JSON.stringify({
        kind: "dss.native.r2.acl-baseline",
        platform: process.platform,
        state: facts.acl.state,
        shape: facts.acl.shape,
        entries: facts.acl.entries,
        osCode: facts.acl.osCode,
      }),
    );
    if (process.platform === "linux") {
      assert.equal(facts.acl.osCode, constants.errno.ENODATA);
      assert.equal(facts.acl.state, "unavailable");
      assert.equal(facts.acl.entries, null);
    } else if (
      process.platform === "darwin" &&
      facts.acl.osCode === constants.errno.ENOENT
    ) {
      assert.equal(facts.acl.state, "unavailable");
      assert.equal(facts.acl.entries, null);
    }
    assert.equal((await probe.inspectSecurityChain(chain)).admitted, false);
  } finally {
    probe.close(chain);
  }
});

test("R2 fixture guards reject missing opt-in before changing fresh ACLs", async () => {
  const paths = fixture();
  const chain = await probe.captureSecurityChain(paths.leaf);
  try {
    const before = await last(chain);
    const command = aclCommand(paths.arena, "entries", "0");
    const result = spawnSync(command.executable, command.args, {
      env: command.env,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 1);
    assert.deepEqual(await last(chain), before);
  } finally {
    probe.close(chain);
  }
});

test("R2 repeated reads and Worker teardown release captured descriptors without path cleanup", async (t) => {
  const paths = fixture();
  const chain = await probe.captureSecurityChain(paths.leaf);
  await last(chain);
  const census =
    process.platform === "linux"
      ? "/proc/self/fd"
      : process.platform === "darwin"
        ? "/dev/fd"
        : null;
  try {
    const before = census ? readdirSync(census).length : null;
    for (let index = 0; index < 32; ++index) await last(chain);
    if (census) assert.equal(readdirSync(census).length, before);
  } finally {
    probe.close(chain);
  }
  const target = statSync(paths.leaf, { bigint: true });
  const countTarget = () =>
    readdirSync(census).filter((name) => {
      if (!/^\d+$/.test(name)) return false;
      try {
        const value = fstatSync(Number(name), { bigint: true });
        return value.dev === target.dev && value.ino === target.ino;
      } catch (error) {
        if (error.code !== "EBADF") throw error;
        return false;
      }
    }).length;
  const beforeWorker = census ? countTarget() : null;
  const worker = new Worker(
    `
    const {parentPort, workerData} = require('node:worker_threads');
    const native = require(workerData.binary);
    (async () => {
      globalThis.chain = await native.captureSecurityChain(workerData.root);
      await native.inspectSecurityChain(globalThis.chain);
      parentPort.on('message', () => {});
      parentPort.postMessage('security-chain-open');
    })().catch(error => { throw error; });
  `,
    { eval: true, workerData: { binary, root: paths.leaf } },
  );
  t.after(() => worker.terminate());
  assert.deepEqual(await once(worker, "message"), ["security-chain-open"]);
  if (census) assert.equal(countTarget(), beforeWorker + 1);
  else assert.throws(() => renameSync(paths.leaf, join(paths.arena, "held")));
  await worker.terminate();
  await nextTurn();
  if (census) assert.equal(countTarget(), beforeWorker);
  renameSync(paths.leaf, join(paths.arena, "closed"));
});
