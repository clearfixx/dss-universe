# D7 — Accepted history and register reconciliation

Date:2026-11-06. Accepted source baseline: `f1a1bcc` (R3 / PR133).
Status: scoped reconciliation, **not final D7 acceptance**. Runtime, migrations,
API/Worker, application data and frontend are unchanged by this packet.

Update2026-11-08, accepted main `7e5cce7`: the owner explicitly limited direct
filesystem writers to themselves and DSS, with users acting only through the
website/API. The DEBT-037 rows/remaining work below now use that scope. C1/PR109
was also accepted and merged; its design is not automatic gamification delivery.
The dated Nov6 metadata snapshot and retained91-row matrix remain historical.

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

| Debt    | Current scoped finding                                               | Evidence inspected                                                                                                                                                                                   |
| ------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 092     | Identified Joi advisory resolved; future dependency risk is separate | PR120 accepted/merged `e6179f7`; API requires Joi^18.3.1, lock resolves18.3.1; API manifest unchanged from that merge to baseline                                                                    |
| 093     | Measured fixture-budget defect corrected; no OS/crypto cause claim   | PR121 accepted into PR120, then main; current real registrations/login are sequential setup hooks, existing deadlines/assertions retained; ledger test has no diff from `e6179f7`                    |
| 084     | Diagnostic evidence/retention disposition remains open               | Accepted evidence collector PR87; existing report discloses missing originals and new controlled comparison; retained route M                                                                        |
| 085     | Scoped arrival lifecycle correction retained                         | Accepted PR96 / `b41dd9e`; universe-arrival component and regression have no diff to baseline; historical raw-evidence limits remain separate                                                        |
| 086     | Diagnostics accepted, original timeout cause open                    | Accepted PR97 / `8e3c4c7`; reporter analysis is not a deadline fix; retained route O                                                                                                                 |
| 087     | Shared smoke endpoint correction retained                            | Accepted PR98 / `b63d555`; resolver/test unchanged, Playwright still imports it; later diff only adds accepted first-failure evidence settings                                                       |
| 037     | Hostile-OS-writer research deferred; not a current pre11 blocker     | Owner's explicit2026-11-08 owner/DSS-only writers and website/API-only users decision; shared key validation and owned intake/delivery retained; R1–R6 inactive, no physical-containment fix claimed |
| 007/090 | C1 accepted; automatic consumption and ordering correction open      | A/A.1/B accepted; PR109 C1 accepted at `34baae0`, merged as `7e5cce7` with exact-head CI8/8/local gate0, E2E689/689, characterization5/5, Web15/15; no runtime consumer or correction implied        |

GitHub metadata was refreshed through the connector and sanitized into
`tools/agent-helpers/d7/accepted-pr-observations-20261106.json`. The helper
independently verifies merged commits are ancestors of baseline and records
whether reviewed-head and merge trees match. PR121's base is its security
branch, not main; main inclusion follows through accepted PR120. At that dated
checkpoint PR109's unmerged preview was excluded. The Nov8 update uses its actual
accepted merge `7e5cce7`, not the earlier synthetic preview SHA.

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

- Nov8 candidate DEBT-094: concurrent authenticated upload intake is reproduced
  with two Media rows but one real queue job. Characterization is not a fix;
  agree and verify its separate bounded runtime correction. See the
  [Media intake evidence](DEBT_094_MEDIA_INTAKE_CONCURRENCY.md). The historical
  91-row matrix and93-entry checkpoint above do not include this new94th ID.
- Reconcile all retained M/O/Q/X rows against current accepted code, tests and
  owner decisions; the original91-row review is not advanced wholesale by this
  packet or by recent green storage checks.
- Keep the current trusted-filesystem-writer deployment assumption explicit;
  DEBT-037's unfinished hostile-writer research is deferred by owner decision.
  Finish DEBT-007 C/D plus the separately reviewed090 source-cycle correction.
- Dispose the remaining administrator-availability047 and Activity/source067
  policy questions; keep unresolved timing/retention evidence explicit, including
  058/059/083/084/086. Later passing gates do not universally identify old causes.
- Preserve owner deferrals: bulk File Passport cleanup, S3/MinIO and the shared
  Search Platform are not silently implemented or made new pre11 blockers.
- Complete final D7 acceptance, then the separately requested stack audit using
  the owner's preserved `docs/audits/STACK_AUDIT_PLAN.md`, then Phase11 brainstorm.

The stack audit and Phase11 are not started by this reconciliation. Current
native observations remain inactive. Reopening hostile-writer admission or
physical-operation research requires an explicit deployment-scope change; it is
not a hidden prerequisite for the current owner-controlled deployment.

The original reconciliation was accepted in PR134 at `35d74ac`, merged as
`48b51ae`; its dated baseline/snapshot remain historical evidence. The current
Nov8 documentation revision requires its own full quality gate and CI before
packet acceptance. Neither prior R6 nor C1 results alone certify this revision.
