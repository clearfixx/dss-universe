/** Completes checks not reached by the retained PR166 local gate.
 * This is supplemental evidence, never a replacement successful full-gate report.
 * Uses existing quality policies; no services, resets, retries or Auth changes.
 */
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  mkdtempSync,
  openSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createQualityEnvironment,
  createBrowserEnvironment,
  qualitySteps,
  assertApiReport,
} from "../../../scripts/full-quality-policy.mjs";
import { resolveWebSmokeEndpoint } from "../../../scripts/web-smoke-endpoint.mjs";
import { assertWebSmokePortFree } from "../../../scripts/web-smoke-preflight.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const expected = "0cc5a914925c2dd74dd84bef4d2836fe7b13a2b3";
const head = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
});
if (head.status !== 0 || head.stdout.trim() !== expected)
  throw new Error("Unexpected source HEAD.");
if (process.version !== "v24.18.0") throw new Error("Pinned Node required.");
const credential = readFileSync(
  resolve(root, "docker-compose.test.yml"),
  "utf8",
).match(/^\s+POSTGRES_PASSWORD:\s*([A-Za-z0-9_]+)\s*$/m)?.[1];
if (!credential) throw new Error("Disposable credential unavailable.");
const env = createQualityEnvironment({
  ...process.env,
  DATABASE_URL: `postgresql://dss_test:${encodeURIComponent(credential)}@127.0.0.1:5434/dss_test`,
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: "6380",
  TEST_REDIS_PORT: "6380",
  DSS_WEB_TEST_PORT: "3195",
});
const pnpm = resolve(
  process.env.LOCALAPPDATA,
  "node/corepack/v1/pnpm/11.9.0/bin/pnpm.cjs",
);
const evidence = mkdtempSync(
  resolve(root, "node_modules/.cache/producer-supplement-"),
);
const report = resolve(evidence, "api-e2e.json");
const log = resolve(evidence, "checks.log");
const fd = openSync(log, "a");
const receipt = {
  head: expected,
  startedAt: new Date().toISOString(),
  supplementalOnly: true,
  steps: [],
  exitCode: 1,
  log,
};
console.log(`Supplemental checks: ${log}`);
function run(args, childEnv = env) {
  console.log(`Running ${args.join(" ")}`);
  const result = spawnSync(process.execPath, [pnpm, ...args], {
    cwd: root,
    env: childEnv,
    stdio: ["ignore", fd, fd],
    windowsHide: true,
  });
  receipt.steps.push({ args, status: result.status, signal: result.signal });
  if (result.error || result.status !== 0)
    throw new Error(`Supplemental step failed: ${args[0]}`);
}
try {
  const steps = qualitySteps(report);
  const start = steps.findIndex((args) => args.includes("test:e2e"));
  if (start < 0) throw new Error("Required remaining quality step missing.");
  for (const args of steps.slice(start)) {
    run(args);
    if (args.includes("test:e2e"))
      assertApiReport(JSON.parse(readFileSync(report, "utf8")), env);
  }
  await assertWebSmokePortFree(resolveWebSmokeEndpoint(env));
  const webReport = resolve(evidence, "web-smoke.json");
  run(
    [
      "--filter",
      "@dss/web",
      "test:e2e",
      "--retries=0",
      "--workers=2",
      "--forbid-only",
      `--reporter=list,${resolve(root, "scripts/full-quality-web-reporter.mjs")}`,
    ],
    {
      ...createBrowserEnvironment(env),
      DSS_QUALITY_WEB_REPORT: webReport,
    },
  );
  const web = JSON.parse(readFileSync(webReport, "utf8"));
  if (web.status !== "passed" || !Number.isInteger(web.tests) || web.tests <= 0)
    throw new Error("Incomplete Web report.");
  receipt.exitCode = 0;
} finally {
  closeSync(fd);
  receipt.endedAt = new Date().toISOString();
  writeFileSync(
    resolve(root, "tools/agent-helpers/producer-supplement.local.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
}
