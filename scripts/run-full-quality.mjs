/**
 * DSS Universe — Full Quality Gate
 * File: scripts/run-full-quality.mjs
 * Purpose: Sequential verification against already prepared disposable services.
 * Important: Never installs services, resets databases or reuses a Web server.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertApiReport,
  createBrowserEnvironment,
  createQualityEnvironment,
  qualitySteps,
} from "./full-quality-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
if (process.argv.length !== 2 || !process.env.npm_execpath) {
  throw new Error(
    "Usage: pnpm quality:full (prepared disposable DB and Redis required)",
  );
}
const env = createQualityEnvironment(process.env);
const cache = resolve(root, "node_modules/.cache");
mkdirSync(cache, { recursive: true });
const evidence = mkdtempSync(resolve(cache, "quality-full-"));
const apiReport = resolve(evidence, "api-e2e.json");

function run(args, childEnv) {
  console.log(`\n[quality:full] ${args.join(" ")}`);
  const result = spawnSync(
    process.execPath,
    [process.env.npm_execpath, ...args],
    {
      cwd: root,
      env: childEnv,
      stdio: "inherit",
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Quality step failed (${result.status ?? result.signal}): ${args[0]}`,
    );
}

async function assertWebPortFree() {
  await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          "Web smoke requires free port 3100; existing servers are never reused or stopped.",
        ),
      ),
    );
    server.listen(3100, "127.0.0.1", () => server.close(resolvePort));
  });
}

await assertWebPortFree();
for (const args of qualitySteps(apiReport)) {
  run(args, env);
  if (args.includes("test:e2e"))
    assertApiReport(JSON.parse(readFileSync(apiReport, "utf8")), env);
}
await assertWebPortFree();
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
    ...createBrowserEnvironment(process.env),
    DSS_QUALITY_WEB_REPORT: resolve(evidence, "web-smoke.json"),
  },
);
const webReport = JSON.parse(
  readFileSync(resolve(evidence, "web-smoke.json"), "utf8"),
);
if (
  webReport.status !== "passed" ||
  !Number.isInteger(webReport.tests) ||
  webReport.tests <= 0
) {
  throw new Error("Full Web smoke did not produce a complete report.");
}
console.log(`[quality:full] Complete. API evidence: ${apiReport}`);
