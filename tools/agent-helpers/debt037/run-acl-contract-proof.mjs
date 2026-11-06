/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Disposable POSIX ACL Contract Proof
 * 📄 File: tools/agent-helpers/debt037/run-acl-contract-proof.mjs
 * 🎯 Purpose: Admits hosted POSIX CI before launching the approved privileged proof harness.
 * 🧠 Responsibilities: Uses existing accounts, validates bounded records and preserves evidence.
 * 🏗️ Architecture: Ad hoc CI diagnostic helper; never loaded by API/Worker.
 * ⚠️ Important: Refuses local/developer execution, new accounts and any admission verdict.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { release } from "node:os";
import { fileURLToPath } from "node:url";

if (
  !["linux", "darwin"].includes(process.platform) ||
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  process.env.DSS_ACL_CONTRACT_PROOF !== "1" ||
  typeof process.getuid !== "function" ||
  process.getuid() === 0 ||
  process.getgid() === 0
)
  throw new Error(
    "ACL contract proof requires explicit opt-in on a disposable hosted POSIX runner.",
  );

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const expectedNode = readFileSync(
  resolve(repository, ".node-version"),
  "utf8",
).trim();
if (process.versions.node !== expectedNode)
  throw new Error("Use the repository-pinned Node runtime.");
const executable = resolve(
  repository,
  "packages/storage/native-probe/build/Release/dss_acl_contract_proof",
);
if (!statSync(executable).isFile())
  throw new Error("Build the owned native proof target first.");
const child = spawnSync(
  "sudo",
  [
    "-n",
    "--preserve-env=GITHUB_ACTIONS,RUNNER_ENVIRONMENT,DSS_ACL_CONTRACT_PROOF",
    executable,
    String(process.getuid()),
    String(process.getgid()),
  ],
  { shell: false, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
);

const allowedRecordKeys = [
  "kind",
  "stage",
  "actor",
  "operation",
  "identityChecked",
  "rc",
  "error",
  "statRc",
  "statError",
  "mode",
  "aclRc",
  "aclError",
  "aclEntries",
  "defaultRc",
  "defaultError",
  "defaultEntries",
  "statxRc",
  "statxError",
  "propertyQueryRc",
  "propertyQueryError",
  "propertyPresent",
  "propertyGetRc",
  "propertyGetError",
  "propertyEntries",
  "attrsRc",
  "attrsError",
  "attrsComplete",
  "attrsSecurityReturned",
  "attrsSecurityLength",
];
const numericKeys = allowedRecordKeys.filter(
  (key) =>
    !["kind", "stage", "actor", "operation", "identityChecked"].includes(key),
);
const records = [];
for (const line of (child.stdout ?? "").split(/\r?\n/).filter(Boolean)) {
  let value;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("Proof emitted an invalid evidence record.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid evidence shape.");
  if (value.kind === "dss.acl-contract.record") {
    if (
      Object.keys(value).sort().join() !==
        [...allowedRecordKeys].sort().join() ||
      !/^[a-z0-9-]+$/.test(value.stage) ||
      !["service", "attacker"].includes(value.actor) ||
      ![
        "mkdir",
        "set-fixture-acl",
        "observe",
        "create-marker",
        "observe-invalid",
      ].includes(value.operation) ||
      value.identityChecked !== true ||
      numericKeys.some(
        (key) =>
          !Number.isInteger(value[key]) ||
          value[key] < -2 ||
          value[key] > 65535,
      )
    )
      throw new Error("Unbounded or invalid proof record.");
  } else if (value.kind === "dss.acl-contract.start") {
    if (
      Object.keys(value).sort().join() !==
        [
          "kind",
          "platform",
          "distinctOrdinaryUsers",
          "accountsChanged",
          "admissionEvaluated",
        ]
          .sort()
          .join() ||
      value.platform !== process.platform ||
      value.distinctOrdinaryUsers !== true ||
      value.accountsChanged !== false ||
      value.admissionEvaluated !== false
    )
      throw new Error("Invalid proof start record.");
  } else if (value.kind === "dss.acl-contract.summary") {
    const keys =
      value.success === true
        ? [
            "kind",
            "success",
            "actorControls",
            "invalidDescriptorChecked",
            "admissionEvaluated",
            "fixturesRetained",
          ]
        : ["kind", "success", "stage", "admissionEvaluated"];
    if (
      Object.keys(value).sort().join() !== keys.sort().join() ||
      value.admissionEvaluated !== false ||
      (value.success === false && !/^[a-z0-9-]+$/.test(value.stage))
    )
      throw new Error("Invalid proof summary.");
  } else throw new Error("Unexpected evidence kind.");
  records.push(value);
}
const summary = records.at(-1);
const expectedControls = process.platform === "linux" ? 7 : 6;
const successful =
  !child.error &&
  child.status === 0 &&
  records[0]?.kind === "dss.acl-contract.start" &&
  summary?.kind === "dss.acl-contract.summary" &&
  summary.success === true &&
  summary.actorControls === expectedControls &&
  summary.invalidDescriptorChecked === true &&
  summary.fixturesRetained === true;
const evidence = {
  kind: "POSIX ACL contract observations, not root admission",
  reviewedSourceHypotheses: JSON.parse(
    readFileSync(
      new URL("./acl-contract-source-pins.json", import.meta.url),
      "utf8",
    ),
  ),
  observedAt: new Date().toISOString(),
  runtime: {
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    kernelRelease: release(),
  },
  successful,
  childExit: child.status,
  childSignal: child.signal,
  records,
};
const reportDirectory = resolve(repository, "node_modules/.cache");
mkdirSync(reportDirectory, { recursive: true });
const report = resolve(
  reportDirectory,
  `acl-contract-proof-${process.platform}.json`,
);
writeFileSync(report, `${JSON.stringify(evidence, null, 2)}\n`);
for (const record of records) console.log(JSON.stringify(record));
if (!successful)
  throw new Error("ACL contract proof failed; bounded evidence was retained.");
console.log(
  JSON.stringify({
    kind: "dss.acl-contract.verified",
    platform: process.platform,
    actorControls: expectedControls,
    admissionEvaluated: false,
  }),
);
