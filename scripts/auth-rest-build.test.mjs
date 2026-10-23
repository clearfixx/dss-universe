/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Build Verification
 * 📄 File: scripts/auth-rest-build.test.mjs
 * 🎯 Purpose: Keeps production REST DTO validation in the post-build gate.
 * 🧠 Responsibilities: executes the built-controller HTTP contract diagnostic.
 * 🏗️ Architecture: Child-process regression; no AppModule or backing services.
 * ⚠️ Important: Requires a fresh API build; does not prove real authentication.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("built REST controller validates concrete DTOs over loopback HTTP", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const result = spawnSync(
    process.execPath,
    ["scripts/audit-auth-rest-metadata.cjs"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const lines = result.stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.deepEqual(lines.at(-1), {
    validDispatches: 5,
    invalidRejectedBeforePresentation: 11,
  });
});
