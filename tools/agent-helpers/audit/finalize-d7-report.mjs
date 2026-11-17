/** Finite directive reconciliation. Historical evidence is preserved verbatim. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../..");
if (existsSync(resolve(root, "docs/audits/FINAL_D7_CLOSURE.md")))
  throw new Error(
    "One-shot reconciliation already exists; review it instead of overwriting.",
  );
const read = (path) => readFileSync(resolve(root, path), "utf8");
const write = (path, text) => writeFileSync(resolve(root, path), text);
const baseline = read("docs/audits/FINAL_D7_PHASE_A.md");
const rows = baseline
  .split(/\r?\n/)
  .filter((line) => /^\| \d{3}\s*\|/.test(line));
if (
  rows.length !== 95 ||
  new Set(rows.map((line) => line.split("|")[1].trim())).size !== 95
)
  throw new Error("Expected the complete 95-ID Phase A baseline.");
const corrections = {
  "007": [
    "FIXED_VERIFIED",
    "Accepted PR164 qualified Points, PR165 Reputation admission, PR166 producer coverage, PR167 headless delivery; final runtime main a4a5451",
    "Actual producer→DB admission→Redis→Points/Levels/Achievements and withdrawal; cutoff, idempotency, recovery, configuration preflight. Deployment activation remains an explicit operator action.",
  ],
  "067": [
    "FIXED_VERIFIED",
    "PR163 merged f12186b; durable Activity retraction history and source serialization; full local gate and CI",
    "Late/replayed creation cannot restore a retracted Activity source; rollback and independent-source regressions pass. Historical lost events are not reconstructed.",
  ],
  "090": [
    "FIXED_VERIFIED",
    "Qualified owner O1/PR147, producer P1/PR149, accepted PR164–167 integration and source-cycle regression suites",
    "Old-cycle withdrawal stays authoritative; legitimate new cycles remain eligible. Real broker withdrawal retires the award; no historical backfill.",
  ],
};
const matrix = rows.map((line) => {
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  const revised = corrections[cells[0]];
  return revised ? `| ${cells[0]} | ${revised.join(" | ")} |` : line;
});
const counts = {};
for (const line of matrix) {
  const status = line.split("|")[2].trim();
  counts[status] = (counts[status] ?? 0) + 1;
}
if (
  counts.FIXED_VERIFIED !== 79 ||
  counts.CONFIRMED_NON_BLOCKER !== 2 ||
  counts.HISTORICAL_EVIDENCE !== 7 ||
  counts.DEFERRED !== 7 ||
  counts.CONFIRMED_BLOCKER ||
  counts.NEEDS_DECISION
)
  throw new Error("Unexpected final dispositions.");
const intro = `# Final D7 closure

Date: 2026-11-17. Status: **CLOSED for the finite Final Audit Closure Directive**.
Reviewed runtime baseline: main \`a4a54511b84e2bd58955482282a13ec4c89dffe8\`,
whose tree matches accepted PR167 head \`13010c1f8cb8b91cbdde4b84b251e57bee33390f\`.
The owner authorized autonomous execution of the directive. This report replaces
old OPEN/candidate/acceptance-pending labels only within their reviewed scopes;
historical checkpoints are evidence, not current task lists. The dated
[Phase A matrix](FINAL_D7_PHASE_A.md) remains the original 95-ID baseline.

## Result and accepted corrections

All confirmed blockers in the approved finite list are corrected and verified.
There are **zero CONFIRMED_BLOCKER and zero NEEDS_DECISION** rows. Totals:
79 FIXED_VERIFIED, 2 CONFIRMED_NON_BLOCKER, 7 HISTORICAL_EVIDENCE, 7 DEFERRED = 95.
These are debt dispositions, not a percentage of product completion.

| PR | Scope | Main merge / accepted implementation |
| --- | --- | --- |
| [163](https://github.com/clearfixx/dss-universe/pull/163) | Activity source ordering, durable earliest retraction | f12186b / c90443f |
| [164](https://github.com/clearfixx/dss-universe/pull/164) | Qualified Points facets, cycle provenance, atomic owner receipts | 8c34e8d / 47506cf |
| [165](https://github.com/clearfixx/dss-universe/pull/165) | Canonical Reputation/Points admission in one read snapshot | 6bb669c / 8f0d7d7 |
| [166](https://github.com/clearfixx/dss-universe/pull/166) | Closed producer coordinates, bounded discovery, configuration guards | d701faf / 0cc5a91 (evidence head4093ee3) |
| [167](https://github.com/clearfixx/dss-universe/pull/167) | Dedicated headless delivery, real broker/owner effects, recovery and operations | a4a5451 / 13010c1 |

The accepted existing O1/P1/C2.1/L1/source guards are reused, not replaced.
Points and Achievements retain source-cycle evidence and bounded retirement;
Levels reads the current authoritative balance. Database claims/receipts govern
work; queue messages are hints. Replay is at least once with owner idempotency,
not an exactly-once promise. Publication/recovery uses token-CAS and separate
failure history. An in-flight owner transaction cannot be cancelled by fencing.

The last correction removes claim row locks from wake inventory. Its PostgreSQL
negative control proves an inventory lock can hide READY work from SKIP LOCKED;
the positive control proves read-only inventory permits the real worker claim.
The broker fixture runs the actual periodic runner and real owner operations.

## Verification and evidence limits

Final local \`quality:full\` on exact head13010c1: **exit0**, 2026-11-17
06:54:45–07:14:27 UTC (08:54–09:14 Kyiv), using Node24.18.0.
Receipt: \`tools/agent-helpers/runtime-delivery-pinned-full-9aeaf89f8ac445feac8779a30e9a6598.local.json\`.
Log: \`node_modules/.cache/runtime-delivery-pinned-full-9aeaf89f8ac445feac8779a30e9a6598.log\`.
Machine-readable evidence: \`node_modules/.cache/quality-full-oAgnt3/\`.

- Format, architecture, dependency/security policies, Prisma validation/generation
  and zero-drift comparison, lint and types passed.
- Coverage ran in all five executable test workspaces; API1632/1632 in191 suites.
- API E2E939/939 in83 suites, zero failures/skips/todo.
- Build6/6, built API entry regressions3/3, Web smoke15/15 without retries.
- Final CI8/8: Quality44034212729, native44034212733, security44034212718.
  Main job133873068441 independently confirms API1632/E2E939 and zero schema diff;
  native48/48 passes on Windows/Linux/macOS. Architecture inventory has no frozen
  findings; explicit narrow-export expectations remain blocking.
- Scoped migrated integration82/82 plus types/lint passed before the full run.
  The final forward migration was deployed only to prepared disposable storage;
  no historical SQL migrations, development data or production data were reset.

Failed evidence is retained, not relabelled. PR167's initial518bcad gate ended
936/938 on broker withdrawal; the concrete inventory interference and fixture
runner correction then required the new full gate. A separate local invocation
used system Node24.22.3 and was rejected by the native Node24.18.0 requirement;
only process-local PATH was corrected. PR166 had an interrupted E2E run and a
1606/1608 local unit result with two unchanged Auth five-second timeouts; its
supplementary E2E926/build/Web pass was never called a successful full gate.
Final1632/939 success verifies the integrated code but does not establish the
cause of those earlier timing observations. Deadlines, assertions and retry
budgets were not weakened. Reports in caches are machine-local artifacts and
may be cleaned; committed summaries retain their scope and identifiers.

## Historical disposition (Phase C)

| ID | Original observation and accepted follow-up | Final interpretation |
| --- | --- | --- |
| 048 | Broad87-HTTP GraphQL registration scenario; later bounded case passes with its existing30000ms budget | HISTORICAL_EVIDENCE; original stalled-operation cause unknown; not a new Auth defect |
| 058 | Five-second document-tool test timeout; worker mitigation accepted separately | HISTORICAL_EVIDENCE; no claim the worker change explains every original timeout |
| 059 | Intermittent Windows schema-write failure | HISTORICAL_EVIDENCE; subsequent generation/build passes do not establish cause |
| 083 | React demo smoke failure; accepted diagnostic PR87 and runtime fixes081/085 | HISTORICAL_EVIDENCE; retained red/first-failure evidence does not prove every natural failure had the same cause |
| 084 | Early-focus/hit-testing observations; original raw artifacts missing; production correction085 accepted | HISTORICAL_EVIDENCE; retention limitation stays explicit, not recovered or waived |
| 086 | Credential-rotation timeout; diagnostic PR97 accepted | HISTORICAL_EVIDENCE; no demonstrated current failure or crypto/fixture correction |
| 095 | Local IAM270-second denial versus CI1.1seconds; diagnostic PR145 accepted inside144 | HISTORICAL_EVIDENCE; later1.3-second observation is not causal proof |

No new diagnostic framework, tests, runtime changes or retry-to-green campaign
was created solely to close these records. Existing regressions remain mandatory.

## Residual risks, deferred work and readiness

026 is a historical completion-wording qualification, not missing automatic
delivery after PR167. 036 retains an upstream braces expansion limitation;
the approved patch, exact advisory exception and14 regressions remain required.
Neither is a confirmed blocker for the accepted finite requirements.

Deferred009/019: bulk File Passport work;017: S3/MinIO adapter;018: shared Search
Platform;037: hostile local OS-writer/native containment research;039: product
Research Lab technical naming/routes;047: future unique-owner guarantees.
These are not reported as fixed or silently implemented. Normal LOCAL storage
assumes the owner and DSS control the filesystem; users access it through API.
Native research remains inactive and is not a production-admission guarantee.

047 explicitly retains the administrative-availability gap. The owner chose the
future unique-owner phase instead of an interim last-ACTIVE-admin recovery rule.
Owner must be undeletable, unbannable, nondeactivatable and retain authority
through DSS commands. Parameterized SQL/least privilege protect application
boundaries, not unrestricted DBA tampering. No backdoor, hidden recovery account
or automatic resurrection is authorized. Schedule this in the owner phase.

Automatic delivery is implemented and tested, **not enabled on development or
production data**. Follow [the runtime runbook](../development/GAMIFICATION_RUNTIME.md):
migrate, verify dependencies/configuration, prepare, explicitly activate the
persisted UTC Outbox.createdAt cutoff, then run the separate process. Existing
pre-cutoff history/balances/markers are not replayed or recalculated. Deployment
verification, capacity and operational backup policies remain deployment work;
this local/CI review is not an inspection of a production server.

D7 is complete under the directive's criteria. The bounded Phase E stack review
is the remaining audit step. The accepted finite blockers no longer prevent
resuming product development/Phase11 planning; this does not claim every1.0
feature is implemented. Frontend ownership and its active branch are untouched.

## Complete final disposition matrix

Unchanged rows inherit their scoped evidence from Phase A and its linked
accepted PR/report history; only007/067/090 change disposition here.

| Debt | Result | Evidence and present scope | Acceptance criterion / remaining action |
| --- | --- | --- | --- |
`;
write("docs/audits/FINAL_D7_CLOSURE.md", intro + matrix.join("\n") + "\n");
let register = read("docs/development/DEBT_REGISTER.md");
const firstEntry = register.indexOf("### DEBT-095");
if (firstEntry < 0) throw new Error("Register checkpoint not found.");
register =
  "# DSS Universe — Engineering Debt Register\n\n" +
  "> Status: finite D7 audit CLOSED, 2026-11-17.\n> Authoritative current dispositions: [final95-ID matrix and acceptance report](../audits/FINAL_D7_CLOSURE.md).\n> 79 FIXED_VERIFIED;2 CONFIRMED_NON_BLOCKER;7 HISTORICAL_EVIDENCE;7 DEFERRED;0 blockers/decisions.\n> Original entries/checkpoints below are retained historical evidence; their OPEN/candidate labels do not override the final matrix.\n> Deferred owner047 is not fixed. Stack review is a separate bounded Phase E result.\n\n" +
  register.slice(firstEntry);
register = register.replace(
  /^### DEBT-007.*$/m,
  "### DEBT-007 — Automatic gamification delivery (High, FIXED_VERIFIED scoped runtime)\n\nFinal2026-11-17: PR164–167 complete qualified owner/admission/producer/delivery/recovery and explicit preflight. Main a4a5451 matches accepted13010c1; exact local full gate exit0, API1632/E2E939, CI8/8. Deployment activation remains off and historical replay excluded. [Final acceptance and limits](../audits/FINAL_D7_CLOSURE.md). Older partial checkpoints below are historical.",
);
register = register.replace(
  /^### DEBT-090.*$/m,
  "### DEBT-090 — Achievements rollback before late original (High, FIXED_VERIFIED scoped cycles)\n\nFinal2026-11-17: accepted qualified owner/producers and PR164–167 integration close old-cycle restoration while permitting legitimate new cycles. Real broker withdrawal, DB ordering/replay and continuation regressions pass. [Final acceptance](../audits/FINAL_D7_CLOSURE.md). No historical backfill or automatic deployment activation. Older checkpoints below are historical.",
);
register = register.replace(
  /^### DEBT-047.*$/m,
  "### DEBT-047 — Administrator availability (High, DEFERRED to owner-model phase)",
);
for (const id of ["048", "058", "059", "083", "084", "086", "095"])
  register = register.replace(
    new RegExp(`^(### DEBT-${id}[^\\n]*?)\\([^\\n]*\\)$`, "m"),
    "$1(HISTORICAL_EVIDENCE; see final D7 disposition)",
  );
write("docs/development/DEBT_REGISTER.md", register);
for (const path of [
  "docs/audits/FINAL_D7_PHASE_A.md",
  "docs/audits/D7_CURRENT_ACCEPTANCE_RECONCILIATION.md",
  "docs/audits/D7_DEBT_DISPOSITION_MATRIX.md",
]) {
  const text = read(path);
  const split = text.indexOf("\n");
  write(
    path,
    text.slice(0, split + 1) +
      "\n> Historical checkpoint. Current authoritative statuses and completion: [Final D7 closure](FINAL_D7_CLOSURE.md), 2026-11-17.\n" +
      text.slice(split + 1),
  );
}
write(
  "docs/development/GAMIFICATION_RUNTIME.md",
  read("docs/development/GAMIFICATION_RUNTIME.md") +
    "\n## Final acceptance — 2026-11-17\n\nPR167 head13010c1 was accepted and merged as main a4a5451. Exact local quality:full exit0, API1632/1632, E2E939/939 without skips/todo, build6/6, Web15/15 without retries; CI8/8 and native48/48 on three OSes. The prior pending checkpoint above is historical. [Final D7 report and retained failures](../audits/FINAL_D7_CLOSURE.md). Developer/production activation was not performed.\n",
);
console.log(JSON.stringify({ ids: 95, counts }));
