/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Full Workspace Verification Test Fixtures
 * 📄 File: scripts/fixtures/workspace-coverage-pnpm.cjs
 *
 * 🎯 Purpose: Simulates package-manager task plans for real runner regression tests.
 * 🧠 Responsibilities:
 * • Supply deterministic covered, missing and failed dry-run evidence.
 * • Mark test execution without launching any workspace process.
 * 🏗️ Architecture: Test-only process fixture, never a production package manager.
 * ⚠️ Important: No network, filesystem writes, database or browser access.
 * 💡 Notes: Environment mode is read only inside this fixture.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const args = process.argv.slice(2);
if (args.slice(0, 3).join(" ") !== "exec turbo run") {
  process.exitCode = 7;
} else if (args.includes("--dry=json")) {
  const mode = process.env.DEBT082_FIXTURE_MODE;
  if (mode === "error") process.exitCode = 7;
  else if (mode === "malformed")
    console.log("SYNTHETIC_PRIVATE_DRY_RUN_PAYLOAD");
  else {
    const taskName = args[3];
    console.log(
      JSON.stringify({
        tasks: [
          {
            taskId: `@dss/editor#${taskName}`,
            command:
              taskName === "test:cov" && mode === "missing"
                ? "<NONEXISTENT>"
                : "vitest run",
          },
        ],
      }),
    );
  }
} else {
  console.log("WORKSPACE_TESTS_EXECUTED");
}
