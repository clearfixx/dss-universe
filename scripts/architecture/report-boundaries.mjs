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
 * • includes a compiler-resolved local file graph over authored API source.
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
import {
  analyzeFileGraph,
  parseGraphCompilerOptions,
} from "./analyze-file-graph.mjs";

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
const files = await walk(join(root, "apps/api/src"));
const compilerOptions = parseGraphCompilerOptions(
  await readFile(join(root, "apps/api/tsconfig.json"), "utf8"),
  join(root, "apps/api"),
);
const findings = [
  ...analyzeBoundaries(
    files.filter(({ path }) =>
      /^apps\/api\/src\/(modules|core|composition)\//.test(path),
    ),
  ),
  ...analyzeFileGraph(files, compilerOptions, root),
].sort((a, b) => a.id.localeCompare(b.id, "en"));
// New technical entries are blocking even while the historical inventory remains report-only.
if (
  findings.some(
    (entry) => entry.rule === "infrastructure-entry-business-import",
  )
) {
  process.exitCode = 1;
}
if (args.has("--json")) {
  console.log(
    JSON.stringify(
      {
        version: 1,
        mode: args.has("--check-baseline") ? "check-baseline" : "report-only",
        findings,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `Architecture inventory (${args.has("--check-baseline") ? "BASELINE CHECK" : "REPORT ONLY"}): ${findings.length} findings; NOT a compliance certificate.`,
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
