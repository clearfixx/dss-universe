/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable Storage Qualification Proof
 * 📄 File: tools/agent-helpers/debt037/r6/actor.cjs
 * 🎯 Purpose: Runs held-object probes inside actual ordinary OS actors.
 * 🧠 Responsibilities: Owns TCP/native barriers and returns bounded observation records.
 * 🏗️ Architecture: Hosted-CI-only child using the accepted R5 launch protocol.
 * ⚠️ Important: No controller credentials, raw OS IDs or paths enter result records.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { createInterface } = require("node:readline");
const { connect } = require("node:net");
const { once } = require("node:events");
const fs = require("node:fs");
const { join } = require("node:path");
const [port, nonce, actor, arena, executable] = process.argv.slice(2);
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  process.env.DSS_RIGHTS_ACTOR_PROOF !== "1" ||
  !["service", "attacker"].includes(actor) ||
  !/^[a-f0-9]{32}$/.test(nonce) ||
  !/^\d{1,5}$/.test(port)
)
  throw new Error("Unadmitted proof child.");
let held;
const records = [];
function inspect(stage, left, right = left) {
  const child = spawnSync(executable, ["--actor", left, right], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 8192,
  });
  assert.equal(child.status, 0);
  assert.equal(child.error, undefined);
  records.push({ stage, evidence: JSON.parse(child.stdout) });
}
async function main() {
  if (process.platform !== "win32") {
    assert.notEqual(process.getuid(), 0);
    assert.equal(process.getuid(), process.geteuid());
    assert.notEqual(process.getgid(), 0);
    assert.equal(process.getgid(), process.getegid());
    assert.ok(process.getgroups().every((id) => id === process.getgid()));
    assert.throws(
      () => process.setuid(0),
      (error) => error.code === "EPERM",
    );
  }
  const socket = connect({ host: "127.0.0.1", port: Number(port) });
  const lines = createInterface({ input: socket });
  let rejectFault;
  const fault = new Promise((_, reject) => {
    rejectFault = reject;
  });
  socket.on("error", rejectFault);
  lines.on("error", rejectFault);
  const iterator = lines[Symbol.asyncIterator]();
  await Promise.race([once(socket, "connect"), fault]);
  socket.write(JSON.stringify({ kind: "ready", actor, nonce }) + "\n");
  try {
    while (true) {
      const next = await Promise.race([iterator.next(), fault]);
      assert.equal(next.done, false);
      assert.ok(next.value.length <= 128);
      const command = next.value;
      if (command === "hold") {
        assert.equal(actor, "service");
        fs.writeFileSync(join(arena, "shared", "service-marker"), "SYNTHETIC", {
          flag: "wx",
        });
        const child = spawn(
          executable,
          ["--hold", join(arena, "shared"), join(arena, "shared")],
          {
            stdio: ["pipe", "pipe", "pipe"],
            shell: false,
            windowsHide: true,
          },
        );
        const input = createInterface({ input: child.stdout });
        const childLines = input[Symbol.asyncIterator]();
        const exited = once(child, "exit");
        exited.catch(rejectFault);
        child.on("error", rejectFault);
        input.on("error", rejectFault);
        child.stderr.on("data", () => {}); // Drain bounded native diagnostics; never publish target paths.
        held = { child, input, childLines, exited };
        const ready = await Promise.race([childLines.next(), fault]);
        assert.equal(ready.done, false);
        assert.equal(JSON.parse(ready.value).kind, "held-ready");
        socket.write('{"kind":"held"}\n');
      } else if (command === "transition") {
        assert.equal(actor, "attacker");
        fs.symlinkSync(
          join(arena, "outside"),
          join(arena, "shared", "alias"),
          process.platform === "win32" ? "junction" : "dir",
        );
        socket.write('{"kind":"transition-created"}\n');
      } else if (command === "observe") {
        if (actor === "service") {
          assert.ok(held);
          held.child.stdin.end("go\n");
          const value = await Promise.race([held.childLines.next(), fault]);
          assert.equal(value.done, false);
          records.push({
            stage: "held-parent-after-transition",
            evidence: JSON.parse(value.value),
          });
          const [code, signal] = await Promise.race([held.exited, fault]);
          assert.equal(code, 0);
          assert.equal(signal, null);
          held.input.close();
          held = null;
          const refused = spawnSync(
            executable,
            ["--actor", join(arena, "shared", "alias"), join(arena, "shared")],
            {
              encoding: "utf8",
              shell: false,
              windowsHide: true,
              maxBuffer: 8192,
            },
          );
          assert.equal(refused.status, 1);
          assert.equal(refused.stdout, "");
          assert.equal(
            JSON.parse(refused.stderr).kind,
            "qualification-failure",
          );
          inspect("same-object", join(arena, "shared"));
          inspect(
            "different-object",
            join(arena, "shared"),
            join(arena, "outside"),
          );
          for (const name of [
            "normal",
            "separate",
            "bind",
            "idmapped",
            "ownership-on",
            "ownership-off",
          ])
            if (name === "normal" || fs.existsSync(join(arena, name))) {
              inspect(name, join(arena, name), join(arena, "normal"));
              if (["normal", "ownership-on", "ownership-off"].includes(name))
                fs.writeFileSync(
                  join(arena, name, "service-marker"),
                  "SYNTHETIC",
                  { flag: "wx" },
                );
            }
          records.push({ stage: "service-creation", checked: true });
          records.push({ stage: "nofollow-transition-refused", checked: true });
        } else {
          fs.writeFileSync(
            join(arena, "shared", "attacker-marker"),
            "SYNTHETIC",
            { flag: "wx" },
          );
          records.push({ stage: "shared-creation", checked: true });
          for (const name of ["ownership-on", "ownership-off"]) {
            if (!fs.existsSync(join(arena, name))) continue;
            let allowed = true;
            try {
              fs.writeFileSync(
                join(arena, name, "attacker-marker"),
                "SYNTHETIC",
                { flag: "wx" },
              );
            } catch (error) {
              assert.ok(["EACCES", "EPERM"].includes(error.code));
              allowed = false;
            }
            records.push({ stage: name + "-actual-creation", allowed });
          }
        }
        socket.write(
          JSON.stringify({
            kind: "result",
            actor,
            identityChecked: true,
            records,
          }) + "\n",
        );
        socket.end();
        return;
      } else assert.fail("Unknown bounded protocol command.");
    }
  } finally {
    if (held) {
      held.child.kill();
      await held.exited;
      held.input.close();
    }
    lines.close();
    socket.destroy();
  }
}
main().catch(() => {
  process.stderr.write("R6 actor verification failed.\n");
  process.exitCode = 1;
});
