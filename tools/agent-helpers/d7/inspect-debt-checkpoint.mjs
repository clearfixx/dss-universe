/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: D7 Evidence Reconciliation
 * 📄 File: tools/agent-helpers/d7/inspect-debt-checkpoint.mjs
 * 🎯 Purpose: Compares a retained D7 inventory with an explicit accepted Git baseline.
 * 🧠 Responsibilities: Records stale inventory, merged ancestry and exact tree facts.
 * 🏗️ Architecture: Read-only diagnostic helper; no application or service imports.
 * ⚠️ Important: Merged ancestry is not debt closure, current runtime health or release acceptance.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const helperRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = resolve(helperRoot, "../..");
const [baseline, checkpointRoot, snapshotName, outputName, ...extra] =
  process.argv.slice(2);
if (
  !baseline ||
  !checkpointRoot ||
  !snapshotName ||
  !outputName ||
  extra.length
) {
  throw new Error(
    "Expected baseline, checkpoint checkout, snapshot JSON under helpers and output.local.json",
  );
}
if (!/^[a-z0-9-]+\.local\.json$/.test(outputName))
  throw new Error("Use a named local output under tools/agent-helpers");
const snapshotPath = resolve(helperRoot, snapshotName);
const snapshotRelative = relative(helperRoot, snapshotPath);
if (
  !snapshotRelative ||
  snapshotRelative.startsWith("..") ||
  isAbsolute(snapshotRelative) ||
  !snapshotRelative.endsWith(".json")
)
  throw new Error(
    "Input snapshot must be a JSON file inside tools/agent-helpers",
  );
if (snapshotPath === resolve(helperRoot, outputName))
  throw new Error("Never overwrite the input evidence snapshot");
if (!isAbsolute(checkpointRoot))
  throw new Error("Checkpoint checkout must be absolute");

function git(args, cwd = repository) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}
function oid(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value))
    throw new Error("Expected a complete commit SHA");
  return value;
}
const acceptedHead = oid(
  git(["rev-parse", "--verify", "--end-of-options", `${baseline}^{commit}`]),
);
const checkpointHead = oid(
  git(["rev-parse", "--verify", "HEAD"], checkpointRoot),
);
const registry = git([
  "show",
  `${acceptedHead}:docs/development/DEBT_REGISTER.md`,
]);
const checkpointMatrix = git(
  ["show", `${checkpointHead}:docs/audits/D7_DEBT_DISPOSITION_MATRIX.md`],
  checkpointRoot,
);
function inventory(text) {
  return [
    ...new Set(
      [...text.matchAll(/^(?:###\s+|\|\s*)(DEBT-\d{3})(?=\s|\s*\|)/gm)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
}
const currentIds = inventory(registry);
const workingRegistryIds = inventory(
  readFileSync(
    resolve(repository, "docs/development/DEBT_REGISTER.md"),
    "utf8",
  ),
);
const rows = [
  ...checkpointMatrix.matchAll(
    /^\|\s*(DEBT-\d{3})\s*\|\s*([CMOQX])\s*\|([^\r\n]*)/gm,
  ),
].map((match) => ({
  id: match[1],
  route: match[2],
  evidence: match[3].trim(),
}));
if (!rows.length || new Set(rows.map((row) => row.id)).size !== rows.length) {
  throw new Error(
    "Missing or duplicate D7 route rows; inspect checkpoint format before reconciliation",
  );
}
const checkpointBaseline = checkpointMatrix.match(
  /Current accepted baseline:\s*`([a-f0-9]+)`/,
)?.[1];
if (!checkpointBaseline)
  throw new Error("Checkpoint does not declare its accepted baseline");
const declaredBaseline = oid(
  git(["rev-parse", "--verify", `${checkpointBaseline}^{commit}`]),
);
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
if (!Array.isArray(snapshot.pullRequests) || !snapshot.pullRequests.length)
  throw new Error("Missing externally observed PR metadata");

const pullRequests = snapshot.pullRequests.map((pr) => {
  if (!Number.isInteger(pr.number) || typeof pr.merged !== "boolean")
    throw new Error("Invalid PR observation");
  oid(pr.head);
  if (!pr.merged)
    return {
      ...pr,
      acceptedBaselineContainsMerge: false,
      reviewedTreeMatchesMerge: null,
    };
  oid(pr.merge);
  const ancestry = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", pr.merge, acceptedHead],
    {
      cwd: repository,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (![0, 1].includes(ancestry.status))
    throw new Error("Cannot establish merged ancestry");
  return {
    ...pr,
    acceptedBaselineContainsMerge: ancestry.status === 0,
    reviewedTreeMatchesMerge:
      git(["rev-parse", `${pr.head}^{tree}`]) ===
      git(["rev-parse", `${pr.merge}^{tree}`]),
  };
});
const output = resolve(helperRoot, outputName);
if (relative(helperRoot, output) !== outputName)
  throw new Error("Evidence output escaped helper root");
const result = {
  kind: "D7 inventory and accepted-history observations; not a release certificate",
  observedAt: new Date().toISOString(),
  acceptedHead,
  acceptedTree: git(["rev-parse", `${acceptedHead}^{tree}`]),
  checkpointHead,
  checkpointDeclaredBaseline: declaredBaseline,
  checkpointCoversCurrentAcceptedHead: declaredBaseline === acceptedHead,
  currentInventory: currentIds,
  workingRegistry: {
    head: git(["rev-parse", "HEAD"]),
    status: git([
      "status",
      "--porcelain",
      "--",
      "docs/development/DEBT_REGISTER.md",
    ]),
    ids: workingRegistryIds,
    newlyRecordedIds: workingRegistryIds.filter(
      (id) => !currentIds.includes(id),
    ),
    notAcceptanceEvidence: true,
  },
  retainedRouteCounts: Object.fromEntries(
    ["C", "M", "O", "Q", "X"].map((route) => [
      route,
      rows.filter((row) => row.route === route).length,
    ]),
  ),
  missingFromRetainedCheckpoint: currentIds.filter(
    (id) => !rows.some((row) => row.id === id),
  ),
  absentFromCurrentInventory: rows
    .map((row) => row.id)
    .filter((id) => !currentIds.includes(id)),
  unresolvedRetainedRoutes: rows.filter((row) => row.route !== "C"),
  pullRequests,
  limits: [
    "Metadata input is an external observation, not refreshed by this helper.",
    "No debt disposition is changed automatically from a green test or merged PR.",
    "Retained route meanings and conclusions belong to their old baseline.",
    "No current service, security, runtime, CI or full-gate verification is performed.",
  ],
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
console.log(
  JSON.stringify({
    acceptedHead,
    checkpointHead,
    checkpointDeclaredBaseline: declaredBaseline,
    currentDebts: currentIds.length,
    workingRegistryDebts: workingRegistryIds.length,
    retainedDebts: rows.length,
    retainedRouteCounts: result.retainedRouteCounts,
    missing: result.missingFromRetainedCheckpoint,
    mergedInAcceptedHistory: pullRequests
      .filter((pr) => pr.acceptedBaselineContainsMerge)
      .map((pr) => pr.number),
    output: outputName,
  }),
);
