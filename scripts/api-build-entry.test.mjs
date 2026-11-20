/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: API Build Verification
 * 📄 File: scripts/api-build-entry.test.mjs
 * 🎯 Purpose: Checks the production command against actual compiled output after build.
 * ⚠️ Important: Syntax checking is not HTTP readiness; no application or service is started.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("API production entry exists and parses after build", () => {
  const api = fileURLToPath(new URL("../apps/api/", import.meta.url));
  const manifest = JSON.parse(
    readFileSync(resolve(api, "package.json"), "utf8"),
  );
  const [runner, entry, ...extra] = manifest.scripts["start:prod"].split(" ");
  assert.equal(runner, "node");
  assert.deepEqual(extra, []);
  const built = resolve(api, `${entry}.js`);
  assert.ok(relative(api, built).startsWith(`dist${sep}`));
  assert.ok(statSync(built).isFile());
  const check = spawnSync(process.execPath, ["--check", built], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.ifError(check.error);
  assert.equal(check.status, 0, check.stderr);
});

test("built gamification command stays disabled without loading deployment services", () => {
  const api = fileURLToPath(new URL("../apps/api/", import.meta.url));
  const manifest = JSON.parse(
    readFileSync(resolve(api, "package.json"), "utf8"),
  );
  const [runner, envOption, localEnvOption, entry, ...extra] =
    manifest.scripts["start:gamification"].split(" ");
  assert.equal(runner, "node");
  assert.equal(envOption, "--env-file-if-exists=.env");
  assert.equal(localEnvOption, "--env-file-if-exists=.env.local");
  assert.deepEqual(extra, []);
  const built = resolve(api, `${entry}.js`);
  assert.ok(relative(api, built).startsWith(`dist${sep}`));
  assert.ok(statSync(built).isFile());
  const child = spawnSync(process.execPath, [built], {
    cwd: api,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
    env: { ...process.env, DSS_GAMIFICATION_ENABLED: "0" },
  });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), "Gamification runtime is disabled.");
  assert.equal(child.stderr, "");
  const invalid = spawnSync(process.execPath, [built, "unknown-operation"], {
    cwd: api,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
    env: { ...process.env, DSS_GAMIFICATION_ENABLED: "0" },
  });
  assert.ifError(invalid.error);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
  assert.equal(
    invalid.stderr.trim(),
    "Gamification operation failed. Check deployment readiness and explicit revisions.",
  );
  const invalidEnvironment = spawnSync(process.execPath, [built, "preflight"], {
    cwd: api,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: "",
      JWT_ACCESS_SECRET: "synthetic-secret-must-not-be-logged",
      JWT_REFRESH_SECRET: "synthetic-refresh-must-not-be-logged",
    },
  });
  assert.ifError(invalidEnvironment.error);
  assert.equal(invalidEnvironment.status, 1);
  assert.equal(invalidEnvironment.stdout, "");
  assert.equal(
    invalidEnvironment.stderr.trim(),
    "Gamification operation failed. Check deployment readiness and explicit revisions.",
  );
});
