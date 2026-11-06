/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Native Topology Evidence
 * 📄 File: packages/storage/native-probe/topology.test.cjs
 * 🎯 Purpose: Verifies private native identity comparisons and topology availability.
 * 🧠 Responsibilities: Exercises real directories, mount controls and resource teardown.
 * 🏗️ Architecture: Mandatory native test runner; no application or mock OS adapter.
 * ⚠️ Important: Equal identities never establish containment or qualified filesystems.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const { once } = require("node:events");
const {
  fstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, parse } = require("node:path");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { Worker } = require("node:worker_threads");
const test = require("node:test");
const binary = join(__dirname, "build", "Release", "dss_storage_probe.node");
const probe = require(binary);
const nativeError = (error) => /^ERR_STORAGE_NATIVE_/.test(error.code);

function fixture() {
  const arena = realpathSync(mkdtempSync(join(tmpdir(), "dss-native-r3-")));
  const left = join(arena, "left");
  const right = join(arena, "right");
  mkdirSync(left);
  mkdirSync(right);
  return { arena, left, right };
}
async function last(chain) {
  return (await probe.inspectTopologyChain(chain)).components.at(-1);
}
function assertObservation(value) {
  assert.deepEqual(Object.keys(value).sort(), ["kind", "osCode", "state"]);
  assert.ok(["present", "unavailable", "unsupported"].includes(value.state));
  assert.match(value.kind, /^[a-z0-9-]+$/);
  assert.ok(Number.isInteger(value.osCode) && value.osCode >= 0);
  if (value.state === "present") assert.equal(value.osCode, 0);
}

test("R3 returns bounded topology observations without native identity bytes", async () => {
  const paths = fixture();
  const chain = await probe.captureRootChain(paths.left);
  try {
    const facts = await probe.inspectTopologyChain(chain);
    assert.deepEqual(Object.keys(facts).sort(), [
      "admitted",
      "components",
      "filesystemQualified",
      "kind",
    ]);
    assert.equal(facts.kind, "topology-evidence");
    assert.equal(facts.admitted, false);
    assert.equal(facts.filesystemQualified, false);
    assert.equal(
      facts.components.length,
      (await probe.inspectChain(chain)).components,
    );
    for (const value of facts.components) {
      assert.deepEqual(Object.keys(value).sort(), [
        "filesystem",
        "filesystemFamily",
        "mount",
        "object",
        "sameFilesystemAsPrevious",
        "sameMountAsPrevious",
        "sameObjectAsPrevious",
        "volumeFlags",
      ]);
      for (const observation of [value.object, value.filesystem, value.mount])
        assertObservation(observation);
      assert.ok(
        [
          "unknown",
          "ntfs",
          "refs",
          "ext",
          "xfs",
          "btrfs",
          "tmpfs",
          "overlay",
          "apfs",
          "hfs",
          "other",
        ].includes(value.filesystemFamily),
      );
      assert.deepEqual(Object.keys(value.volumeFlags).sort(), [
        "local",
        "osCode",
        "persistentAcl",
        "readOnly",
        "state",
      ]);
      for (const relation of [
        value.sameObjectAsPrevious,
        value.sameFilesystemAsPrevious,
        value.sameMountAsPrevious,
      ])
        assert.ok([null, true, false].includes(relation));
    }
    const first = facts.components[0];
    assert.equal(first.sameObjectAsPrevious, null);
    assert.equal(first.sameFilesystemAsPrevious, null);
    assert.equal(first.sameMountAsPrevious, null);
    assert.equal(JSON.stringify(facts).includes(paths.arena), false);
    assert.equal(facts.components.at(-1).object.state, "present");
    assert.equal(facts.components.at(-1).filesystem.state, "present");
  } finally {
    probe.close(chain);
  }
});

test("R3 compares independent held objects without exposing serials or inode numbers", async () => {
  const paths = fixture();
  const left = await probe.captureRootChain(paths.left);
  const alias = await probe.captureRootChain(paths.left);
  const right = await probe.captureRootChain(paths.right);
  try {
    const equal = await probe.compareTopologyChains(left, alias);
    assert.deepEqual(Object.keys(equal).sort(), [
      "admitted",
      "kind",
      "sameFilesystem",
      "sameMount",
      "sameObject",
    ]);
    assert.equal(equal.kind, "topology-comparison");
    assert.equal(equal.admitted, false);
    assert.equal(equal.sameObject, true);
    assert.equal(equal.sameFilesystem, true);
    const different = await probe.compareTopologyChains(left, right);
    assert.equal(different.sameObject, false);
    assert.equal(different.sameFilesystem, true);
    assert.equal(different.admitted, false);
  } finally {
    probe.close(left);
    probe.close(alias);
    probe.close(right);
  }
});

test("R3 keeps mount identity separate from volume identity and unsupported observations", async () => {
  const paths = fixture();
  const chain = await probe.captureRootChain(paths.left);
  try {
    const facts = await last(chain);
    const equal = await probe.compareTopologyChains(chain, chain);
    assertObservation(facts.mount);
    if (process.platform === "linux") {
      if (process.env.CI)
        assert.equal(
          facts.mount.state,
          "present",
          "The Linux CI positive control must observe its actual mount",
        );
      if (facts.mount.state === "present") {
        assert.ok(
          ["linux-unique-mount-id", "linux-legacy-mount-id"].includes(
            facts.mount.kind,
          ),
        );
        assert.equal(equal.sameMount, true);
      } else assert.equal(equal.sameMount, null);
      assert.equal(facts.volumeFlags.local, null);
      assert.equal(facts.volumeFlags.persistentAcl, null);
    } else {
      assert.equal(facts.mount.state, "unsupported");
      assert.ok(facts.mount.osCode > 0);
      assert.equal(equal.sameMount, null);
      if (process.platform === "darwin")
        assert.equal(facts.volumeFlags.local, true);
      else {
        assert.equal(facts.volumeFlags.local, null);
        assert.equal(facts.volumeFlags.persistentAcl, true);
      }
    }
    assert.equal(facts.volumeFlags.state, "present");
    assert.equal(facts.volumeFlags.readOnly, false);
    console.info(
      JSON.stringify({
        kind: "dss.native.r3.observation",
        platform: process.platform,
        object: facts.object.kind,
        filesystem: facts.filesystem.kind,
        family: facts.filesystemFamily,
        mountState: facts.mount.state,
        mountKind: facts.mount.kind,
        flagsState: facts.volumeFlags.state,
      }),
    );
  } finally {
    probe.close(chain);
  }
});

test("R3 validates caller kinds, arity and both comparison arguments before queueing", async () => {
  const paths = fixture();
  const chain = await probe.captureRootChain(paths.left);
  const security = await probe.captureSecurityChain(paths.left);
  const root = await probe.openRoot(paths.left);
  try {
    for (const forged of [{}, Object.create(chain), new Proxy(chain, {})]) {
      assert.throws(() => probe.inspectTopologyChain(forged), nativeError);
      assert.throws(
        () => probe.compareTopologyChains(chain, forged),
        nativeError,
      );
      assert.throws(
        () => probe.compareTopologyChains(forged, chain),
        nativeError,
      );
    }
    assert.throws(() => probe.inspectTopologyChain(root), nativeError);
    assert.throws(() => probe.compareTopologyChains(root, chain), nativeError);
    assert.throws(() => probe.compareTopologyChains(chain), nativeError);
    assert.throws(() => probe.inspectTopologyChain(chain, chain), nativeError);
    assert.equal(
      (await probe.compareTopologyChains(chain, security)).sameObject,
      true,
    );
    assert.equal((await probe.inspectSecurityChain(security)).admitted, false);
    assert.throws(() => probe.inspectSecurityChain(chain), nativeError);
  } finally {
    probe.close(chain);
    probe.close(security);
    probe.close(root);
  }
  assert.throws(() => probe.inspectTopologyChain(chain), nativeError);
  assert.throws(
    () => probe.compareTopologyChains(chain, security),
    nativeError,
  );
});

test("R3 queued observations pin both chains across idempotent logical close", async () => {
  const paths = fixture();
  const first = await probe.captureRootChain(paths.left);
  const second = await probe.captureRootChain(paths.left);
  const observation = probe.inspectTopologyChain(first);
  const comparison = probe.compareTopologyChains(first, second);
  probe.close(first);
  probe.close(second);
  probe.close(second);
  assert.equal((await observation).admitted, false);
  assert.equal((await comparison).sameObject, true);
  assert.throws(() => probe.inspectTopologyChain(second), nativeError);
});

test("R3 observes retained identity after namespace rename without reopening the old path", async () => {
  const paths = fixture();
  const chain = await probe.captureRootChain(paths.left);
  const moved = join(paths.arena, "moved");
  try {
    if (process.platform === "win32") {
      assert.throws(() => renameSync(paths.left, moved));
      assert.equal(
        (await probe.compareTopologyChains(chain, chain)).sameObject,
        true,
      );
    } else {
      renameSync(paths.left, moved);
      const current = await probe.captureRootChain(moved);
      try {
        assert.equal(
          (await probe.compareTopologyChains(chain, current)).sameObject,
          true,
        );
      } finally {
        probe.close(current);
      }
    }
  } finally {
    probe.close(chain);
  }
  if (process.platform === "win32") renameSync(paths.left, moved);
});

test("R3 records real filesystem/mount relationships without creating host mounts", async () => {
  const paths = fixture();
  const left = await probe.captureRootChain(paths.left);
  // Linux CI already provides a distinct tmpfs mount; this creates only a new fixture.
  const otherPath =
    process.platform === "linux"
      ? realpathSync(mkdtempSync("/dev/shm/dss-native-r3-"))
      : parse(paths.left).root;
  const right = await probe.captureRootChain(otherPath);
  try {
    const comparison = await probe.compareTopologyChains(left, right);
    assert.equal(comparison.sameObject, false);
    const sameDevice = statSync(paths.left).dev === statSync(otherPath).dev;
    assert.equal(comparison.sameFilesystem, sameDevice);
    if (process.platform === "linux") {
      assert.equal(
        sameDevice,
        false,
        "The tmpfs fixture is a genuine different-filesystem positive control",
      );
      if (comparison.sameMount !== null)
        assert.equal(comparison.sameMount, false);
      else if (process.env.CI)
        assert.fail(
          "Linux CI must supply a mount identity for the cross-mount control",
        );
    } else assert.equal(comparison.sameMount, null);
    assert.equal(comparison.admitted, false);
  } finally {
    probe.close(left);
    probe.close(right);
  }
});

test("R3 repeated queries and Worker teardown release all captured resources", async (t) => {
  const paths = fixture();
  const chain = await probe.captureRootChain(paths.left);
  const census =
    process.platform === "linux"
      ? "/proc/self/fd"
      : process.platform === "darwin"
        ? "/dev/fd"
        : null;
  try {
    await last(chain);
    const baseline = census ? readdirSync(census).length : null;
    for (let index = 0; index < 32; ++index)
      await probe.compareTopologyChains(chain, chain);
    if (census) assert.equal(readdirSync(census).length, baseline);
  } finally {
    probe.close(chain);
  }
  const target = statSync(paths.left, { bigint: true });
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
  const baseline = census ? countTarget() : null;
  const worker = new Worker(
    `
    const {parentPort, workerData} = require('node:worker_threads');
    const native = require(workerData.binary);
    (async () => {
      globalThis.chain = await native.captureRootChain(workerData.root);
      await native.inspectTopologyChain(globalThis.chain);
      parentPort.on('message', () => {});
      parentPort.postMessage('topology-ready');
    })().catch(error => { throw error; });
  `,
    { eval: true, workerData: { binary, root: paths.left } },
  );
  t.after(() => worker.terminate());
  assert.deepEqual(await once(worker, "message"), ["topology-ready"]);
  if (census) assert.equal(countTarget(), baseline + 1);
  else assert.throws(() => renameSync(paths.left, join(paths.arena, "held")));
  await worker.terminate();
  await nextTurn();
  if (census) assert.equal(countTarget(), baseline);
  renameSync(paths.left, join(paths.arena, "released"));
});
