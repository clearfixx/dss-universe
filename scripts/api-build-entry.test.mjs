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
