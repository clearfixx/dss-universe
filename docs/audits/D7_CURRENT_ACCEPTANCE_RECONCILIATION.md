# D7 — Accepted history and register reconciliation

Date:2026-11-06. Accepted source baseline: `f1a1bcc` (R3 / PR133).
Status: scoped reconciliation, **not final D7 acceptance**. Runtime, migrations,
API/Worker, application data and frontend are unchanged by this packet.

## Verified discrepancy

The retained D7 checkout is commit `81e0a6581b9ae27f683e4ec442790e16075cf9ba`,
branch `debt/d7-release-gate`. Its `docs/audits/D7_DEBT_DISPOSITION_MATRIX.md`
declares accepted baseline `289b24c`, contains91 unique routes and explicitly
states that it is not a release certificate. Retained counts are C38/M43/O4/Q2/X4.
Those are historical disposition categories, not completion percentages or a
current93-entry verdict.

At main `f1a1bcc`, the primary register contains89 distinct heading/table IDs:
084–087 are missing despite their existing audit reports and retained D7 rows;
092/093 exist in main but are missing from the retained91-row matrix. Their
union is93 entries. The candidate register restores084–087, retaining084's
evidence limitation and086's open cause. It updates092/093 only to the scope
actually accepted. No broad route M is silently promoted to C.

## Source-to-acceptance checks

| Debt    | Current scoped finding                                               | Evidence inspected                                                                                                                                                                |
| ------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 092     | Identified Joi advisory resolved; future dependency risk is separate | PR120 accepted/merged `e6179f7`; API requires Joi^18.3.1, lock resolves18.3.1; API manifest unchanged from that merge to baseline                                                 |
| 093     | Measured fixture-budget defect corrected; no OS/crypto cause claim   | PR121 accepted into PR120, then main; current real registrations/login are sequential setup hooks, existing deadlines/assertions retained; ledger test has no diff from `e6179f7` |
| 084     | Diagnostic evidence/retention disposition remains open               | Accepted evidence collector PR87; existing report discloses missing originals and new controlled comparison; retained route M                                                     |
| 085     | Scoped arrival lifecycle correction retained                         | Accepted PR96 / `b41dd9e`; universe-arrival component and regression have no diff to baseline; historical raw-evidence limits remain separate                                     |
| 086     | Diagnostics accepted, original timeout cause open                    | Accepted PR97 / `8e3c4c7`; reporter analysis is not a deadline fix; retained route O                                                                                              |
| 087     | Shared smoke endpoint correction retained                            | Accepted PR98 / `b63d555`; resolver/test unchanged, Playwright still imports it; later diff only adds accepted first-failure evidence settings                                    |
| 037     | R1/R2/R3 foundations accepted; physical containment open             | PR131/132/133 merged; no admitted-root, effective-rights policy, complete mount qualification or API/Worker activation                                                            |
| 007/090 | Automatic consumption and ordering correction remain open            | A/A.1/B accepted; PR109 C1 remains unmerged, no acceptance inferred from its synthetic merge SHA                                                                                  |

GitHub metadata was refreshed through the connector and sanitized into
`tools/agent-helpers/d7/accepted-pr-observations-20261106.json`. The helper
independently verifies merged commits are ancestors of baseline and records
whether reviewed-head and merge trees match. PR121's base is its security
branch, not main; main inclusion follows through accepted PR120. PR109's
unmerged preview commit is deliberately excluded from accepted ancestry.

Metadata observation and Git ancestry alone are not a security or debt-closure
proof. The source checks and reviewed acceptance scope above are also required.
No historical failed run or missing trace is relabelled as passing evidence.

## Reproducible helper

Run from the repository using an existing checkout at the retained checkpoint:

```text
node tools/agent-helpers/d7/inspect-debt-checkpoint.mjs main <absolute-retained-checkout> d7/accepted-pr-observations-20261106.json d7-current-report.local.json
```

The helper reads Git/source and writes only a new named `.local.json` report
under tools/agent-helpers. It never overwrites a report, updates dispositions,
executes archived helpers, changes branches, contacts services, reads credentials
or resets data. The external metadata snapshot is explicitly dated, not silently
refreshed. Working-registry inventory is labelled unaccepted candidate evidence,
separate from the requested accepted baseline and retained checkpoint.

## Remaining D7 work

- Reconcile all retained M/O/Q/X rows against current accepted code, tests and
  owner decisions; the original91-row review is not advanced wholesale by this
  packet or by recent green storage checks.
- Finish DEBT-037 physical policy/operations/integration and DEBT-007 C/D plus
  the separately reviewed090 source-cycle correction.
- Dispose the remaining administrator-availability047 and Activity/source067
  policy questions; keep unresolved timing/retention evidence explicit, including
  058/059/083/084/086. Later passing gates do not universally identify old causes.
- Preserve owner deferrals: bulk File Passport cleanup, S3/MinIO and the shared
  Search Platform are not silently implemented or made new pre11 blockers.
- Complete final D7 acceptance, then the separately requested stack audit using
  the owner's preserved `docs/audits/STACK_AUDIT_PLAN.md`, then Phase11 brainstorm.

The stack audit and Phase11 are not started by this reconciliation. Current
native observations remain inactive; owner/ACL/filesystem policy and physical
operation guarantees still require their own evidence and approved scope.

This packet's final full quality gate and CI are pending at the documentation
checkpoint. Accepted PR133's earlier full gate0/CI8/8, E2E688/688, native36 per
platform, build6/6 and Web15/15 are retained baseline evidence, not a claim that
the new reconciliation helper or documentation has already passed those gates.
