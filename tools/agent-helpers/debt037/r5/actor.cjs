/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Rights Actor Proof
 * 📄 File: tools/agent-helpers/debt037/r5/actor.cjs
 * 🎯 Purpose: Runs the actual async addon inside an ordinary service or attacker process.
 * 🧠 Responsibilities: Uses ready/go barriers and returns bounded assertion evidence only.
 * 🏗️ Architecture: CI-only child; no application imports or production paths.
 * ⚠️ Important: Controller credentials and identities never enter protocol records.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const net = require("node:net");
const readline = require("node:readline");
const fs = require("node:fs");
const { join } = require("node:path");
const { once } = require("node:events");
const [portText, nonce, actor, arena, binary] = process.argv.slice(2);
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  process.env.DSS_RIGHTS_ACTOR_PROOF !== "1" ||
  !["service", "attacker"].includes(actor) ||
  !/^[a-f0-9]{32}$/.test(nonce) ||
  !/^\d{1,5}$/.test(portText)
)
  throw new Error("Unadmitted proof child.");
const names = [
  "protected",
  "control",
  "shared",
  "unsafe",
  "inherited",
  "denied",
  "deny-allow",
  "parent",
  "parent/child",
  "empty",
  "null",
];
const chains = new Map();
let probe;
let activeSocket;
let stage = "setup";
function denied(action) {
  assert.throws(action, (error) => ["EACCES", "EPERM"].includes(error.code));
}
async function run() {
  stage = "identity";
  if (process.platform !== "win32") {
    assert.notEqual(process.getuid(), 0);
    assert.notEqual(process.getgid(), 0);
    assert.equal(process.getuid(), process.geteuid());
    assert.equal(process.getgid(), process.getegid());
    assert.ok(
      process
        .getgroups()
        .every((group) => group === process.getgid() && group !== 0),
    );
    denied(() => process.setuid(0));
  }
  if (actor === "attacker") {
    stage = "create-foreign";
    fs.mkdirSync(join(arena, "foreign"), { mode: 0o755 });
  } else {
    stage = "load-addon";
    probe = require(binary);
    for (const name of names) fs.mkdirSync(join(arena, name), { mode: 0o700 });
    fs.writeFileSync(join(arena, "control", "secret"), "SYNTHETIC PRIVATE");
    for (const name of [...names, "foreign"]) {
      stage = "capture-" + name.replace("/", "-");
      chains.set(name, await probe.captureSecurityChain(join(arena, name)));
    }
  }
  const socket = net.connect({ host: "127.0.0.1", port: Number(portText) });
  activeSocket = socket;
  socket.setEncoding("utf8");
  const input = readline.createInterface({ input: socket });
  await once(socket, "connect");
  const go = once(input, "line");
  socket.write(JSON.stringify({ kind: "ready", actor, nonce }) + "\n");
  const [command] = await go;
  assert.equal(command, "go");
  const checks = {};
  if (actor === "service") {
    async function inspect(name, role = "protected-parent") {
      stage = name;
      const value = await probe.inspectRoleRights(chains.get(name), role);
      assert.equal(value.admitted, false);
      assert.equal(value.filesystemQualified, false);
      const item = value.components.at(-1);
      for (const fact of [
        "owner",
        "serviceAccess",
        "aclMetadata",
        "grantModel",
        "inheritanceModel",
        "parentModel",
      ]) {
        assert.deepEqual(Object.keys(item[fact]).sort(), [
          "osCode",
          "reason",
          "state",
        ]);
      }
      return item;
    }
    const safe = await inspect("protected");
    assert.equal(safe.ownerClass, "service");
    assert.equal(safe.owner.state, "satisfied");
    assert.equal(safe.serviceAccess.state, "satisfied");
    assert.equal(safe.grantModel.state, "satisfied");
    assert.equal(safe.inheritanceModel.state, "satisfied");
    fs.writeFileSync(
      join(arena, "protected", "service-created"),
      "SYNTHETIC SERVICE",
    );
    checks.usableProtected = true;
    const control = await inspect("control", "private-control");
    assert.equal(control.grantModel.state, "satisfied");
    assert.equal(control.serviceAccess.state, "satisfied");
    assert.equal(
      fs.readFileSync(join(arena, "control", "secret"), "utf8"),
      "SYNTHETIC PRIVATE",
    );
    checks.usablePrivate = true;
    const shared = await inspect("shared", "shared-namespace");
    assert.equal(shared.grantModel.state, "satisfied");
    assert.equal(shared.serviceAccess.state, "satisfied");
    checks.sharedCreationModel = true;
    assert.equal((await inspect("foreign")).owner.state, "violated");
    checks.foreignOwner = true;
    assert.equal((await inspect("unsafe")).grantModel.state, "violated");
    checks.dangerousAllow = true;
    assert.equal(
      (await inspect("inherited")).inheritanceModel.state,
      "violated",
    );
    checks.inheritedGrant = true;
    assert.equal((await inspect("denied")).serviceAccess.state, "violated");
    denied(() =>
      fs.writeFileSync(join(arena, "denied", "forbidden-service"), "NO"),
    );
    checks.serviceDenial = true;
    assert.equal((await inspect("parent/child")).parentModel.state, "violated");
    checks.parentDeletion = true;
    if (process.platform !== "linux") {
      assert.equal((await inspect("deny-allow")).grantModel.state, "violated");
      checks.noDenyCredit = true;
    }
    if (process.platform === "win32") {
      const empty = await inspect("empty"),
        absent = await inspect("null");
      assert.equal(empty.grantModel.state, "satisfied");
      assert.equal(empty.serviceAccess.state, "violated");
      assert.equal(absent.grantModel.state, "violated");
      assert.equal(absent.serviceAccess.state, "satisfied");
      checks.emptyVsNull = true;
    }
    for (const value of chains.values()) probe.close(value);
  } else {
    stage = "attacker-controls";
    fs.writeFileSync(
      join(arena, "shared", "attacker-created"),
      "SYNTHETIC ATTACKER",
    );
    checks.sharedCreation = true;
    denied(() => fs.writeFileSync(join(arena, "protected", "forbidden"), "NO"));
    checks.protectedDenial = true;
    denied(() => fs.readFileSync(join(arena, "control", "secret")));
    checks.privateDenial = true;
    fs.writeFileSync(
      join(arena, "unsafe", "attacker-created"),
      "SYNTHETIC UNSAFE",
    );
    checks.allowPositive = true;
    if (process.platform !== "linux") {
      denied(() => fs.writeFileSync(join(arena, "deny-allow", "denied"), "NO"));
      checks.denyKernelControl = true;
    }
  }
  socket.end(
    JSON.stringify({ kind: "result", actor, identityChecked: true, checks }) +
      "\n",
  );
  await once(socket, "close");
  input.close();
}
run().catch((error) => {
  const message = JSON.stringify({ kind: "failure", actor, stage }) + "\n";
  if (activeSocket && !activeSocket.destroyed)
    activeSocket.end(message, () => process.exit(1));
  else {
    const code =
      typeof error.code === "string" && /^[A-Z_]{2,64}$/.test(error.code)
        ? error.code
        : "UNKNOWN";
    const osCode =
      Number.isInteger(error.osCode) &&
      error.osCode >= 0 &&
      error.osCode <= 0xffffffff
        ? error.osCode
        : 0;
    try {
      fs.writeFileSync(
        join(arena, actor + "-failure.json"),
        JSON.stringify({ stage, code, osCode }),
        { flag: "wx" },
      );
    } catch {}
    process.stderr.write("Ordinary rights actor proof failed during setup.\n");
    process.exit(1);
  }
});
