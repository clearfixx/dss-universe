/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Architecture Tooling
 * 📄 File: scripts/architecture/report-boundaries.mjs
 *
 * 🎯 Purpose:
 * Reports API architecture debt and checks an explicit frozen inventory on demand.
 *
 * 🧠 Responsibilities:
 * • reads authored API source and the baseline;
 * • separates report-only diagnostics from inventory drift failure.
 *
 * 🏗️ Architecture:
 * Read-only tooling entry point; never rewrites the baseline automatically.
 *
 * ⚠️ Important:
 * Exit zero in report mode is not architectural compliance.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { analyzeBoundaries, compareBaseline } from "./analyze-boundaries.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = new Set(process.argv.slice(2));
for (const argument of args) {
  if (!["--json", "--check-baseline"].includes(argument))
    throw new Error(`Unknown argument: ${argument}`);
}
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      files.push({
        path: relative(root, path).replaceAll("\\", "/"),
        source: await readFile(path, "utf8"),
      });
    }
  }
  return files;
}
const files = [
  ...(await walk(join(root, "apps/api/src/modules"))),
  ...(await walk(join(root, "apps/api/src/core"))),
];
const findings = analyzeBoundaries(files);
if (args.has("--json")) {
  console.log(
    JSON.stringify({ version: 1, mode: "report-only", findings }, null, 2),
  );
} else {
  console.log(
    `Architecture inventory (REPORT ONLY): ${findings.length} findings; NOT a compliance certificate.`,
  );
  for (const finding of findings)
    console.log(
      `${finding.rule} | ${finding.file} | ${finding.detail} | ${finding.package}`,
    );
}
if (args.has("--check-baseline")) {
  const baseline = JSON.parse(
    await readFile(
      join(root, "docs/architecture/architecture-baseline.json"),
      "utf8",
    ),
  );
  const drift = compareBaseline(findings, baseline.findings);
  if (drift.added.length || drift.removed.length) {
    console.error(
      `Baseline drift: ${drift.added.length} added, ${drift.removed.length} removed. Review, do not auto-regenerate.`,
    );
    for (const finding of drift.added) console.error(`ADDED ${finding.id}`);
    for (const finding of drift.removed) console.error(`REMOVED ${finding.id}`);
    process.exitCode = 1;
  } else
    console.error(
      `Frozen inventory matches (${findings.length} known findings, not waived).`,
    );
}
