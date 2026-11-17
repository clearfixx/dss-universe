/** Read-only finite-matrix and evidence-scope check, not a runtime quality gate. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "../../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const report = read("docs/audits/FINAL_D7_CLOSURE.md");
const rows = report
  .split(/\r?\n/)
  .filter((line) => /^\| \d{3}\s*\|/.test(line));
const expected = {
  FIXED_VERIFIED: 79,
  CONFIRMED_NON_BLOCKER: 2,
  HISTORICAL_EVIDENCE: 7,
  DEFERRED: 7,
};
const counts = {};
const ids = new Set();
for (const row of rows) {
  const [id, status] = row
    .split("|")
    .slice(1, 3)
    .map((cell) => cell.trim());
  if (ids.has(id)) throw new Error("Repeated debt ID.");
  ids.add(id);
  counts[status] = (counts[status] ?? 0) + 1;
}
if (
  rows.length !== 95 ||
  Object.keys(counts).length !== 4 ||
  Object.entries(expected).some(
    ([status, count]) => counts[status] !== count,
  ) ||
  Array.from({ length: 95 }, (_, index) =>
    String(index + 1).padStart(3, "0"),
  ).some((id) => !ids.has(id))
)
  throw new Error("Final disposition matrix mismatch.");
for (const path of [
  "docs/audits/FINAL_D7_CLOSURE.md",
  "docs/audits/STACK_AUDIT_RESULT_2026-11-17.md",
]) {
  const text = read(path);
  if (!text.includes("a4a54511b84e2bd58955482282a13ec4c89dffe8"))
    throw new Error("Missing accepted runtime baseline.");
}
const changed = execFileSync(
  "git",
  ["diff", "a4a54511b84e2bd58955482282a13ec4c89dffe8", "--name-only"],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
if (
  changed.some(
    (path) =>
      !path.startsWith("docs/") &&
      !path.startsWith("tools/agent-helpers/audit/"),
  )
)
  throw new Error("Closure must not change runtime, dependencies or frontend.");
console.log(
  JSON.stringify({
    ids: ids.size,
    counts,
    trackedScope: "docs-and-audit-helpers-only",
  }),
);
