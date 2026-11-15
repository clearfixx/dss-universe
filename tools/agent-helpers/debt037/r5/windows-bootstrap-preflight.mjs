/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Rights Bootstrap Diagnostic
 * 📄 File: tools/agent-helpers/debt037/r5/windows-bootstrap-preflight.mjs
 * 🎯 Purpose: Checks the authored JS bootstrap and minimal environment under the current user.
 * 🧠 Responsibilities: Uses fresh ordinary fixtures without logons, accounts or elevation.
 * 🏗️ Architecture: Local diagnostic, separate from the required distinct-user Win32 proof.
 * ⚠️ Important: Does not call the privileged controller or establish primary-token process launch.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
assert.equal(process.platform, "win32");
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const source = readFileSync(resolve(here, "windows-process.cs"), "utf8");
const expression = source.match(
  /const string bootstrap = ([\s\S]+?);\r?\n\s*var marker/,
);
assert.ok(expression, "Expected the explicit authored bootstrap constant.");
const bootstrap = [...expression[1].matchAll(/"(?:\\.|[^"\\])*"/g)]
  .map((item) => JSON.parse(item[0]))
  .join("");
const nonce = randomUUID().replaceAll("-", "");
mkdirSync(resolve(root, "node_modules/.cache"), { recursive: true });
const arena = resolve(
  root,
  "node_modules/.cache",
  "r5-bootstrap-preflight-" + nonce,
);
mkdirSync(arena);
const marker = resolve(arena, "bootstrap.json");
const child = spawnSync(
  process.execPath,
  [
    "--eval",
    bootstrap,
    marker,
    resolve(here, "actor.cjs"),
    "0",
    nonce,
    "attacker",
    arena,
    resolve(
      root,
      "packages/storage/native-probe/build/Release/dss_storage_probe.node",
    ),
  ],
  {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    cwd: arena,
    env: {
      GITHUB_ACTIONS: "true",
      RUNNER_ENVIRONMENT: "github-hosted",
      DSS_RIGHTS_ACTOR_PROOF: "1",
      SystemRoot: process.env.SystemRoot,
      TEMP: arena,
      TMP: arena,
    },
  },
);
assert.equal(child.status, 1); // Windows rejects port0 as an invalid remote endpoint.
assert.deepEqual(JSON.parse(readFileSync(marker, "utf8")), {
  started: true,
  environmentReady: true,
});
assert.ok(statSync(resolve(arena, "foreign")).isDirectory());
const failure = JSON.parse(
  readFileSync(resolve(arena, "attacker-failure.json"), "utf8"),
);
assert.equal(failure.code, "EADDRNOTAVAIL");
const report = {
  kind: "windows-bootstrap-preflight",
  currentUserOnly: true,
  started: true,
  environmentReady: true,
  actorReachedConnection: true,
  distinctActorsEvaluated: false,
  admitted: false,
};
writeFileSync(
  resolve(arena, "result.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
