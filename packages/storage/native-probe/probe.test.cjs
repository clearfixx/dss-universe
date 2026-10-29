/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/probe.test.cjs
 *
 * 🎯 Purpose:
 * Verifies real native resource isolation and lifecycle behavior.
 *
 * 🧠 Responsibilities:
 * • Exercises rejected arguments, links and closed/forged capabilities.
 * • Checks in-flight ownership, failure cleanup and environment teardown.
 *
 * 🏗️ Architecture:
 * Opt-in Node test runner using actual OS objects, without application services.
 *
 * ⚠️ Important:
 * Synthetic temp fixtures remain for inspection; never recursively delete link paths.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { once } = require("node:events");
const {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  linkSync,
  symlinkSync,
  renameSync,
  readdirSync,
  statSync,
  fstatSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { Worker } = require("node:worker_threads");
const test = require("node:test");
const binary = join(__dirname, "build", "Release", "dss_storage_probe.node");
const probe = require(binary); // Missing/unloadable native artifact must fail.

function fixture() {
  const arena = mkdtempSync(join(tmpdir(), "dss-native-p1-"));
  const root = join(arena, "uploads");
  const outside = join(arena, "outside");
  mkdirSync(root);
  mkdirSync(outside);
  writeFileSync(join(root, "sample.txt"), "DSS π");
  writeFileSync(join(outside, "sentinel.txt"), "SYNTHETIC OUTSIDE");
  return { arena, root, outside };
}
const nativeError = (error) => /^ERR_STORAGE_NATIVE_/.test(error.code);

test("prototype exports are explicit and public portable exports remain isolated", () => {
  assert.deepEqual(Object.getOwnPropertyNames(probe).sort(), [
    "close",
    "inspect",
    "openFile",
    "openRoot",
  ]);
  const manifest = require("../package.json");
  assert.deepEqual(Object.keys(manifest.exports), ["."]);
});

test("opens opaque root/file resources and describes their actual OS metadata", async () => {
  const paths = fixture();
  const root = await probe.openRoot(paths.root);
  const file = await probe.openFile(root, "sample.txt");
  try {
    assert.deepEqual(Object.getOwnPropertyNames(root), []);
    assert.equal(JSON.stringify(file), "{}");
    assert.equal((await probe.inspect(root)).kind, "root");
    assert.deepEqual(await probe.inspect(file), {
      kind: "file",
      size: BigInt(Buffer.byteLength("DSS π")),
      links: 1,
    });
  } finally {
    probe.close(file);
    probe.close(root);
  }
});

test("rejects forged, inherited and proxy objects before touching an OS resource", async () => {
  const root = await probe.openRoot(fixture().root);
  try {
    for (const fake of [
      {},
      [],
      null,
      undefined,
      1,
      "root",
      Object.create(root),
      new Proxy(root, {}),
    ]) {
      assert.throws(() => probe.inspect(fake), {
        code: "ERR_STORAGE_NATIVE_CAPABILITY",
      });
      assert.throws(() => probe.close(fake), {
        code: "ERR_STORAGE_NATIVE_CAPABILITY",
      });
    }
  } finally {
    probe.close(root);
  }
});

test("validates callback arity and JS strings", () => {
  assert.throws(() => probe.openRoot(), {
    code: "ERR_STORAGE_NATIVE_ARGUMENTS",
  });
  assert.throws(() => probe.openRoot("one", "two"), {
    code: "ERR_STORAGE_NATIVE_ARGUMENTS",
  });
  assert.throws(() => probe.openRoot(7), { code: "ERR_STORAGE_NATIVE_STRING" });
  assert.throws(() => probe.close(), { code: "ERR_STORAGE_NATIVE_ARGUMENTS" });
});

test("rejects traversal/absolute/multicomponent inputs without changing sentinels", async () => {
  const paths = fixture();
  const root = await probe.openRoot(paths.root);
  try {
    for (const name of [
      "",
      ".",
      "..",
      "a/b",
      "a\\b",
      "x:y",
      "/etc/passwd",
      "x\0y",
    ]) {
      await assert.rejects(probe.openFile(root, name), {
        code: "ERR_STORAGE_NATIVE_COMPONENT",
      });
    }
    assert.equal(
      readFileSync(join(paths.outside, "sentinel.txt"), "utf8"),
      "SYNTHETIC OUTSIDE",
    );
  } finally {
    probe.close(root);
  }
});

test("root failures are controlled and do not expose configured paths", async () => {
  const paths = fixture();
  for (const path of [
    "relative",
    join(paths.root, "missing"),
    join(paths.root, "sample.txt"),
    "bad\0root",
  ]) {
    await assert.rejects(probe.openRoot(path), (error) => {
      assert.ok(nativeError(error));
      assert.equal(error.message.includes(paths.arena), false);
      assert.equal(typeof error.osCode, "number");
      return true;
    });
  }
});

test("close is idempotent, immediately rejects new work and enforces kinds", async () => {
  const root = await probe.openRoot(fixture().root);
  const file = await probe.openFile(root, "sample.txt");
  assert.throws(() => probe.openFile(file, "another"), {
    code: "ERR_STORAGE_NATIVE_CAPABILITY_KIND",
  });
  probe.close(root);
  probe.close(root);
  assert.throws(() => probe.inspect(root), {
    code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
  });
  assert.throws(() => probe.openFile(root, "sample.txt"), {
    code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
  });
  assert.equal((await probe.inspect(file)).kind, "file");
  probe.close(file);
  probe.close(file);
  assert.throws(() => probe.inspect(file), {
    code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
  });
});

test("queued work pins its OS resource across logical close", async () => {
  const root = await probe.openRoot(fixture().root);
  const opening = probe.openFile(root, "sample.txt");
  probe.close(root);
  const file = await opening;
  const inspection = probe.inspect(file);
  probe.close(file);
  assert.throws(() => probe.inspect(file), {
    code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
  });
  assert.equal((await inspection).size, BigInt(Buffer.byteLength("DSS π")));
});

test("rejects hard links and releases handles acquired before validation failure", async () => {
  const paths = fixture();
  const linked = join(paths.root, "hardlink");
  linkSync(join(paths.outside, "sentinel.txt"), linked);
  const root = await probe.openRoot(paths.root);
  try {
    for (let index = 0; index < 64; index++) {
      await assert.rejects(probe.openFile(root, "hardlink"), {
        code: "ERR_STORAGE_NATIVE_LINK",
      });
    }
    // Windows cannot rename the entry if rejected opens leaked no-delete-share handles.
    renameSync(linked, join(paths.root, "hardlink-moved"));
    assert.equal(
      readFileSync(join(paths.outside, "sentinel.txt"), "utf8"),
      "SYNTHETIC OUTSIDE",
    );
  } finally {
    probe.close(root);
  }
});

test("rejects nonregular leaves and POSIX FIFO opening does not block", async () => {
  const paths = fixture();
  mkdirSync(join(paths.root, "directory"));
  const root = await probe.openRoot(paths.root);
  try {
    await assert.rejects(probe.openFile(root, "directory"), nativeError);
  } finally {
    probe.close(root);
  }
  if (process.platform !== "win32") {
    execFileSync("mkfifo", [join(paths.root, "fifo")]);
    execFileSync(
      process.execPath,
      [
        "-e",
        `
      const assert = require('node:assert/strict');
      const native = require(process.argv[1]);
      (async () => {
        const root = await native.openRoot(process.argv[2]);
        try {
          await assert.rejects(native.openFile(root, 'fifo'), {code:'ERR_STORAGE_NATIVE_OBJECT_TYPE'});
        } finally { native.close(root); }
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `,
        binary,
        paths.root,
      ],
      { timeout: 5000, encoding: "utf8" },
    );
  }
});

test("rejects linked roots and linked directory leaves on the actual platform", async () => {
  const paths = fixture();
  const linkedRoot = join(paths.arena, "root-link");
  const linkedLeaf = join(paths.root, "leaf-link");
  const type = process.platform === "win32" ? "junction" : "dir";
  symlinkSync(paths.outside, linkedRoot, type);
  symlinkSync(paths.outside, linkedLeaf, type);
  await assert.rejects(probe.openRoot(linkedRoot), nativeError);
  const root = await probe.openRoot(paths.root);
  try {
    await assert.rejects(probe.openFile(root, "leaf-link"), nativeError);
  } finally {
    probe.close(root);
  }
});

test("repeated successful and failed operations release observable OS resources", async () => {
  const paths = fixture();
  const census =
    process.platform === "linux"
      ? "/proc/self/fd"
      : process.platform === "darwin"
        ? "/dev/fd"
        : null;
  for (let index = 0; index < 8; index++) {
    const root = await probe.openRoot(paths.root);
    probe.close(root);
  }
  const before = census ? readdirSync(census).length : null;
  for (let index = 0; index < 64; index++) {
    const root = await probe.openRoot(paths.root);
    const file = await probe.openFile(root, "sample.txt");
    await assert.rejects(probe.openFile(root, "missing"), nativeError);
    probe.close(file);
    probe.close(root);
  }
  if (census) assert.equal(readdirSync(census).length, before);
  renameSync(join(paths.root, "sample.txt"), join(paths.root, "renamed.txt"));
  renameSync(paths.root, join(paths.arena, "closed-root"));
});

test("environment teardown finalizes unclosed native resources without process exit", async (t) => {
  const paths = fixture();
  const census =
    process.platform === "linux"
      ? "/proc/self/fd"
      : process.platform === "darwin"
        ? "/dev/fd"
        : null;
  const targets = [
    statSync(paths.root, { bigint: true }),
    statSync(join(paths.root, "sample.txt"), { bigint: true }),
  ];
  const countTargetDescriptors = () => {
    let count = 0;
    for (const name of readdirSync(census)) {
      if (!/^\d+$/.test(name)) continue;
      try {
        const info = fstatSync(Number(name), { bigint: true });
        if (
          targets.some(
            (target) => target.dev === info.dev && target.ino === info.ino,
          )
        )
          count++;
      } catch (error) {
        if (error.code !== "EBADF") throw error;
      }
    }
    return count;
  };
  if (census) assert.equal(countTargetDescriptors(), 0);
  const worker = new Worker(
    `
    const { parentPort, workerData } = require('node:worker_threads');
    const native = require(workerData.binary);
    (async () => {
      globalThis.root = await native.openRoot(workerData.root);
      globalThis.file = await native.openFile(globalThis.root, 'sample.txt');
      parentPort.on('message', () => {});
      parentPort.postMessage('resources-open');
    })().catch(error => { throw error; });
  `,
    { eval: true, workerData: { binary, root: paths.root } },
  );
  t.after(() => worker.terminate());
  assert.deepEqual(await once(worker, "message"), ["resources-open"]);
  if (process.platform === "win32") {
    assert.throws(() =>
      renameSync(paths.root, join(paths.arena, "still-open")),
    );
    assert.throws(() =>
      renameSync(
        join(paths.root, "sample.txt"),
        join(paths.root, "still-open.txt"),
      ),
    );
  } else {
    assert.equal(countTargetDescriptors(), 2);
  }
  await worker.terminate();
  await nextTurn();
  if (census) assert.equal(countTargetDescriptors(), 0);
  renameSync(
    join(paths.root, "sample.txt"),
    join(paths.root, "after-worker.txt"),
  );
  renameSync(paths.root, join(paths.arena, "after-worker-root"));
});
