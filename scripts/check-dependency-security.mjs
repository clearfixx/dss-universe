/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Dependency Security
 * 📄 File: scripts/check-dependency-security.mjs
 *
 * 🎯 Purpose:
 * Enforces high/critical audit failures with one owner-approved patched advisory.
 *
 * 🧠 Responsibilities:
 * • verifies the exact local braces patch and every installed braces copy;
 * • runs real patch regressions before applying the narrowly scoped exception;
 * • fails closed for registry errors, invalid audit data or other high findings.
 *
 * 🏗️ Architecture: Repository quality gate, not application runtime.
 * ⚠️ Important: Raw audit findings remain visible; an exception is not an upstream fix.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const patchHash =
  "95ac7e525b684535e9ed6ec0f95f0d7d05499378694d007bc43ca94c16f4b7b1";
const advisoryId = "GHSA-vfj7-8cjw-p6xm";
const hashes = {
  "parse.js":
    "5e440c97a8f5d33c72b931b45de5980636a06543a5265dd901fec4651bd7415b",
  "compile.js":
    "138ea02daae273f1092e815db430c507d538d1f2ddf459e82d2405a216085d01",
  "expand.js":
    "bfcf93cb5a4dd5c27b32f065f7153c66ec0bd4c24063e87c1736814d3e1d5046",
  "stringify.js":
    "c1ad82d8275ba5d5b9bf6215e5d2983ea5fa4e85ac54658500f2c51a46a2b55f",
  "validate-depth.js":
    "4d1d24ef2d561439b594b331ea1b92fb0472faf47ec270239cfa1b2e5f7142f6",
};
const digest = (value) => createHash("sha256").update(value).digest("hex");

export function evaluateAudit(report, patchVerified) {
  if (
    !report ||
    report.error ||
    !report.advisories ||
    !report.metadata?.vulnerabilities
  )
    throw new Error("Missing or invalid dependency audit report");
  const blocking = [];
  const exceptions = [];
  let high = 0;
  let critical = 0;
  for (const advisory of Object.values(report.advisories)) {
    if (
      !["info", "low", "moderate", "high", "critical"].includes(
        advisory.severity,
      )
    )
      throw new Error("Unknown advisory severity");
    if (advisory.severity === "high") high++;
    if (advisory.severity === "critical") critical++;
    if (!["high", "critical"].includes(advisory.severity)) continue;
    const excepted =
      patchVerified &&
      advisory.github_advisory_id === advisoryId &&
      advisory.module_name === "braces" &&
      advisory.severity === "high" &&
      Array.isArray(advisory.findings) &&
      advisory.findings.length > 0 &&
      advisory.findings.every((finding) => finding.version === "3.0.3");
    (excepted ? exceptions : blocking).push(advisory);
  }
  if (
    report.metadata.vulnerabilities.high !== high ||
    report.metadata.vulnerabilities.critical !== critical
  )
    throw new Error("Audit severity totals do not match advisory evidence");
  return { blocking, exceptions };
}

function verifyPatch() {
  if (
    digest(readFileSync(resolve(root, "patches/braces@3.0.3.patch"))) !==
    patchHash
  )
    throw new Error("Unapproved braces patch digest");
  const store = resolve(root, "node_modules/.pnpm");
  const copies = readdirSync(store).filter((name) =>
    name.startsWith("braces@"),
  );
  if (!copies.length) throw new Error("No installed braces evidence");
  for (const copy of copies) {
    const directory = resolve(store, copy, "node_modules/braces");
    const pkg = JSON.parse(
      readFileSync(resolve(directory, "package.json"), "utf8"),
    );
    if (pkg.version !== "3.0.3")
      throw new Error(
        "Reassess braces exception for changed installed version",
      );
    for (const [file, expected] of Object.entries(hashes)) {
      const source = readFileSync(
        resolve(directory, "lib", file),
        "utf8",
      ).replaceAll("\r\n", "\n");
      if (digest(source) !== expected)
        throw new Error(`Installed braces patch mismatch: ${copy}/${file}`);
    }
  }
  const regressions = spawnSync(
    process.execPath,
    ["--test", "scripts/braces-patch.test.mjs"],
    { cwd: root, stdio: "inherit" },
  );
  if (regressions.error || regressions.status !== 0)
    throw new Error("braces regressions failed");
  console.log(
    `Verified approved braces patch and ${copies.length} installed copy/copies.`,
  );
}

function main() {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error("Run through pnpm security:check");
  const audit = spawnSync(process.execPath, [pnpm, "audit", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (audit.error || ![0, 1].includes(audit.status))
    throw new Error("Dependency audit execution failed");
  const report = JSON.parse(audit.stdout);
  console.log(JSON.stringify(report, null, 2));
  verifyPatch();
  const result = evaluateAudit(report, true);
  for (const advisory of result.exceptions)
    console.warn(
      `OWNER-APPROVED EXCEPTION: ${advisory.github_advisory_id}, braces3.0.3, exact patched files +14 regressions. Upstream advisory remains OPEN.`,
    );
  for (const advisory of result.blocking)
    console.error(
      `BLOCKING: ${advisory.github_advisory_id ?? advisory.module_name} (${advisory.severity})`,
    );
  process.exitCode = result.blocking.length ? 1 : 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
