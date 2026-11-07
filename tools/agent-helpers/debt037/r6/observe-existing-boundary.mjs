/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Qualification Design Evidence
 * 📄 File: tools/agent-helpers/debt037/r6/observe-existing-boundary.mjs
 * 🎯 Purpose: Records the precise qualification gaps in existing private diagnostics.
 * 🧠 Responsibilities: Checks real held-object positives and preserves bounded evidence.
 * 🏗️ Architecture: Current-user helper using accepted R3/R5; no new native operation.
 * ⚠️ Important: Fresh synthetic fixtures only; never admission, ACL repair or an actor proof.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
assert.equal(
  process.argv.length,
  2,
  "No arbitrary target or trust input is accepted.",
);
assert.equal(
  process.versions.node,
  readFileSync(join(root, ".node-version"), "utf8").trim(),
);
assert.ok(["win32", "linux", "darwin"].includes(process.platform));
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
}).trim();
assert.match(head, /^[a-f0-9]{40}$/);
const binary = join(
  root,
  "packages/storage/native-probe/build/Release/dss_storage_probe.node",
);
const binarySha256 = createHash("sha256")
  .update(readFileSync(binary))
  .digest("hex");
const probe = createRequire(import.meta.url)(binary);
const cache = join(root, "node_modules/.cache");
mkdirSync(cache, { recursive: true });
const arena = realpathSync(mkdtempSync(join(cache, "qualification-baseline-")));
const target = join(arena, "owned");
mkdirSync(target, { mode: 0o700 });
const chain = await probe.captureSecurityChain(target);
let alias;
let record;
try {
  alias = await probe.captureSecurityChain(target);
  const topology = await probe.inspectTopologyChain(chain);
  const rights = await probe.inspectRoleRights(chain, "private-control");
  const comparison = await probe.compareTopologyChains(chain, alias);
  assert.equal(topology.admitted, false);
  assert.equal(topology.filesystemQualified, false);
  assert.equal(rights.admitted, false);
  assert.equal(rights.filesystemQualified, false);
  assert.equal(rights.atomic, false);
  assert.deepEqual(rights.qualificationsRequired, [
    "identity-domain",
    "filesystem-and-transition",
    "creation-protocol",
    "hostile-operations",
  ]);
  assert.equal(comparison.admitted, false);
  assert.equal(
    comparison.sameObject,
    true,
    "Independent captures must identify this same live object.",
  );
  assert.equal(comparison.sameFilesystem, true);
  assert.ok(
    topology.components.length > 1 && topology.components.length <= 1024,
  );
  assert.equal(topology.components.length, rights.components.length);
  const leaf = topology.components.at(-1);
  const role = rights.components.at(-1);
  assert.equal(leaf.object.state, "present");
  assert.equal(leaf.filesystem.state, "present");
  assert.match(
    leaf.filesystemFamily,
    /^(ntfs|refs|ext|xfs|btrfs|tmpfs|overlay|apfs|hfs|other|unknown)$/,
  );
  assert.ok(
    ["present", "unavailable", "unsupported"].includes(leaf.mount.state),
  );
  assert.match(leaf.mount.kind, /^[a-z0-9-]{1,64}$/);
  assert.ok(
    Number.isInteger(leaf.mount.osCode) &&
      leaf.mount.osCode >= 0 &&
      leaf.mount.osCode <= 0xffffffff,
  );
  for (const value of [
    leaf.volumeFlags.local,
    leaf.volumeFlags.persistentAcl,
    comparison.sameMount,
  ])
    assert.ok(value === null || typeof value === "boolean");
  const rightsStates = {};
  for (const key of [
    "owner",
    "serviceAccess",
    "aclMetadata",
    "grantModel",
    "inheritanceModel",
    "parentModel",
  ]) {
    assert.ok(
      ["satisfied", "violated", "unavailable", "unsupported"].includes(
        role[key].state,
      ),
    );
    rightsStates[key] = role[key].state;
  }
  if (process.platform === "win32" || process.platform === "darwin") {
    assert.equal(leaf.mount.state, "unsupported");
    assert.equal(comparison.sameMount, null);
  }
  record = {
    kind: "existing-qualification-boundary",
    head,
    platform: process.platform,
    node: process.version,
    binarySha256,
    admitted: false,
    filesystemQualified: false,
    atomic: false,
    componentCount: topology.components.length,
    filesystemFamily: leaf.filesystemFamily,
    mount: {
      state: leaf.mount.state,
      kind: leaf.mount.kind,
      osCode: leaf.mount.osCode,
    },
    local: leaf.volumeFlags.local,
    persistentAcl: leaf.volumeFlags.persistentAcl,
    sameObject: comparison.sameObject,
    sameFilesystem: comparison.sameFilesystem,
    sameMount: comparison.sameMount,
    rightsStates,
    qualificationsRequired: rights.qualificationsRequired,
    actorProof: false,
    fixtureRetained: true,
  };
} finally {
  if (alias) probe.close(alias);
  probe.close(chain);
}
assert.throws(() => probe.inspectTopologyChain(chain), {
  code: "ERR_STORAGE_NATIVE_CAPABILITY_CLOSED",
});
const serialized = JSON.stringify(record, null, 2) + "\n";
assert.ok(Buffer.byteLength(serialized) <= 4096);
assert.equal(serialized.includes(arena), false);
writeFileSync(join(arena, "evidence.json"), serialized, {
  flag: "wx",
  mode: 0o600,
});
process.stdout.write(serialized);
