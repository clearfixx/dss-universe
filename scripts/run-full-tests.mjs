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
import { assertWorkspaceCoverage } from "./workspace-coverage-policy.mjs";

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
if (task === "test:cov") {
  function dry(taskName) {
    const plan = spawnSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "exec",
        "turbo",
        "run",
        taskName,
        "--dry=json",
        "--env-mode=strict",
      ],
      {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        env,
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    if (plan.error || plan.status !== 0) {
      throw new Error("Coverage preflight could not read the Turbo task plan.");
    }
    try {
      return JSON.parse(plan.stdout);
    } catch {
      throw new Error("Coverage preflight returned invalid Turbo JSON.");
    }
  }
  const required = assertWorkspaceCoverage(dry("test"), dry("test:cov"));
  console.log(
    `Coverage preflight verified ${required.length} test workspaces.`,
  );
}
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
