/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Full Workspace Verification
 * 📄 File: scripts/workspace-coverage-policy.mjs
 *
 * 🎯 Purpose: Rejects coverage plans that omit executable workspace tests.
 * 🧠 Responsibilities:
 * • Validate the actual Turbo dry-run task evidence.
 * • Require an executable coverage task for every executable test task.
 * • Report task identities without exposing environment values.
 * 🏗️ Architecture: Pure repository policy shared by the runner and regressions.
 * ⚠️ Important: Task presence alone is insufficient: NONEXISTENT is not a command.
 * 💡 Notes: Does not execute tests or claim discovery of unregistered spec files.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

function tasksFrom(graph) {
  if (
    !graph ||
    !Array.isArray(graph.tasks) ||
    graph.tasks.some(
      (task) =>
        !task ||
        typeof task.taskId !== "string" ||
        typeof task.command !== "string",
    )
  ) {
    throw new Error("Coverage preflight requires valid Turbo task evidence.");
  }
  const tasks = new Map(graph.tasks.map((task) => [task.taskId, task.command]));
  if (tasks.size !== graph.tasks.length) {
    throw new Error("Coverage preflight rejects duplicate task identities.");
  }
  return tasks;
}

function executable(command) {
  const normalized = command?.trim();
  return Boolean(normalized) && normalized !== "<NONEXISTENT>";
}

export function assertWorkspaceCoverage(testGraph, coverageGraph) {
  const tests = tasksFrom(testGraph);
  const coverage = tasksFrom(coverageGraph);
  const required = [...tests]
    .filter(([id, command]) => id.endsWith("#test") && executable(command))
    .map(([id]) => `${id.slice(0, -"#test".length)}#test:cov`)
    .sort();
  if (required.length === 0) {
    throw new Error("Coverage preflight requires non-empty workspace tests.");
  }
  const missing = required.filter((id) => !executable(coverage.get(id)));
  if (missing.length > 0) {
    throw new Error(
      `Coverage plan omits workspace tests: ${missing.join(", ")}`,
    );
  }
  return required;
}
