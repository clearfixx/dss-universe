/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Local Quality Evidence
 * 📄 File: tools/agent-helpers/quality/inspect-iam-timeout.mjs
 *
 * 🎯 Purpose:
 * Compares captured IAM test timing without rerunning or modifying the test.
 *
 * 🧠 Responsibilities:
 * • reads existing local/CI JSON and structured log records inside workspace cache;
 * • emits bounded timing/status facts without headers, bodies, SQL or credentials.
 *
 * ⚠️ Important:
 * Wall-clock gaps do not identify sleep, process suspension or a runtime cause.
 * No service connections, test execution, archive execution or source mutation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

const paths = process.argv.slice(2);
if (paths.length !== 3)
  throw new Error("Expected local report, local log and CI report paths.");
const cache = resolve("node_modules/.cache");
const inputs = paths.map((input) => {
  const path = resolve(input);
  if (!path.startsWith(cache + sep) || statSync(path).size > 50_000_000)
    throw new Error("Expected bounded captured evidence in workspace cache.");
  return readFileSync(path, "utf8");
});
const title =
  "DSS API (e2e) manages IAM permissions through the owned repository and rolls back failed audit";
function findCase(json) {
  const report = JSON.parse(json);
  const matches = report.testResults.flatMap((suite) =>
    suite.assertionResults.filter((test) => test.fullName === title),
  );
  if (matches.length !== 1) throw new Error("Expected exactly one IAM case.");
  const test = matches[0];
  if (!Number.isFinite(test.startAt) || !Number.isFinite(test.duration))
    throw new Error("Expected captured wall-clock timing.");
  return {
    status: test.status,
    startAt: test.startAt,
    durationMs: test.duration,
    passed: report.numPassedTests,
    total: report.numTotalTests,
    failed: report.numFailedTests,
  };
}
const local = findCase(inputs[0]);
const ci = findCase(inputs[2]);
const responses = [];
for (const line of inputs[1].split(/\r?\n/)) {
  if (!line.startsWith("{")) continue;
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    continue;
  }
  if (
    !Number.isFinite(record.time) ||
    record.time < local.startAt ||
    record.time > local.startAt + local.durationMs + 5000 ||
    typeof record.req?.url !== "string" ||
    !record.req.url.startsWith("/api/iam/permissions")
  )
    continue;
  responses.push({
    offsetMs: record.time - local.startAt,
    method: record.req.method,
    path: record.req.url
      .split("?")[0]
      .replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi, ":id"),
    status: record.res?.statusCode,
    responseTimeMs: record.responseTime,
  });
}
process.stdout.write(
  JSON.stringify(
    {
      case: title,
      local,
      ci,
      observedIamResponsesInWallInterval: responses.slice(0, 30),
      observedResponseCount: responses.length,
      causeEstablished: false,
    },
    null,
    2,
  ) + "\n",
);
