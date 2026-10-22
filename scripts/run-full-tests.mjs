/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Full Workspace Verification
 * 📄 File: scripts/run-full-tests.mjs
 * 🎯 Purpose: Runs the explicit integration profile through strict Turbo without restoring stale test results.
 * ⚠️ Important: pnpm is inherited from the invoking package manager; no shell or service provisioning.
 * ===============================================================
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import policy from "./full-api-test-policy.cjs";

const { createFullTestEnvironment } = policy;
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--coverage")) {
  throw new Error("Usage: pnpm test:full [--coverage]");
}
if (!process.env.npm_execpath) {
  throw new Error("Run full verification through pnpm test:full.");
}
const env = createFullTestEnvironment(process.env);
const task = args[0] === "--coverage" ? "test:cov" : "test";
const result = spawnSync(
  process.execPath,
  [
    process.env.npm_execpath,
    "exec",
    "turbo",
    "run",
    task,
    "--force",
    "--env-mode=strict",
    "--concurrency=1",
  ],
  {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env,
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
