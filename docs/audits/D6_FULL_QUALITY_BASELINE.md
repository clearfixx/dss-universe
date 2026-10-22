# D6 — Current full quality baseline evidence

Date: 2026-10-22. Branch: `debt/d6-quality-baseline`, draft PR#79.
Verified application/test source checkpoint:2e8efee. Status: local gates green;
new-head remote CI, phase review and acceptance remain open.

## Logical checkpoints

- c10c937 — DEBT-073 explicit complete uncached API profile. All five remote
  checks passed; remote coverage1281/1281 and E2E586/586 were inspected.
- 395c744 — DEBT-055 production entry matches clean Nest output; actual
  production-mode liveness/readiness passed with disposable DB/Redis. Its CI
  later failed the independent social-privacy assertion (DEBT-074).
- 6d24676 — approved DEBT-061 canonicalv1 identity, historical markers/DLQ
  preserved, live isolated DB/Redis compatibility probes and wiring regression.
- 20e1d2e — approved DEBT-074 test-only presence synchronization, including
  exact HTTP response versus deliberately later persistence evidence.
- 2e8efee — separately scoped D6 DEBT-041 actual-byte TOTP corruption tests,
  retaining authenticated-decryption rejection and unchanged-envelope controls.

No frontend source, public API, schema/migration, dependency or runtime timeout
changed in these three latest checkpoints. The Worker identity correction is
an intentional approved runtime change; the two later corrections are tests.

## Final combined local verification

`pnpm quality` naturally exits0: formatting, lint, typecheck, Prisma validation,
33 full-profile controls, API1284/1284 in170 suites, Worker50/50, Web60/60,
Storage43/43, Editor23/23, build, production-entry regression and architecture
140/140 with zero findings. License checks are included in architecture:check.

The exact disposable5435 container identity, loopback port, tmpfs and absence
of DB clients were checked before recreation. All54 existing migrations were
applied without editing migration history or touching dev DB5433. Fresh full
coverage then passes: API1284/1284, Worker50/50, Web60/60, seven tasks and zero
cached results,1m38.826s. Without any reset between stages, full API E2E naturally
exits0:590/590 tests in54 suites,470.584s. JSON success is true with zero
failed/pending/todo/runtime-error suites; this is not inferred from console PASS.

Afterward: zero DB clients/private schemas, no owneddss-debt061 Redis keys,
full SDL SHA256 unchanged:
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Final security policy, exact accepted braces patch and GraphQL consistency pass.
The existing owner-approved braces advisory exception remains explicit/open;
no new exception or blanket vulnerability waiver was added.

## Retained evidence and limits

Local temp logs: `dss-d6-combined-quality.log`,
`dss-d6-combined-migrations.log`, `dss-d6-combined-coverage.log`,
`dss-d6-combined-e2e.log`, `dss-d6-combined-security.log`,
`dss-d6-combined-graphql.log`. Full JSON:
`node_modules/.cache/d6-combined-e2e.json` in the retained D6 worktree.
Earlier failed CI/resource/lint/TOTP attempts remain documented in the
individual debt reports, not replaced by the final green result.

Do not archive the worktree before preserving needed ignored evidence.
This local evidence does not prove a new clean remote checkout, a fresh local
browser-to-database story, every historical debt's resolution or full product
acceptance. Remote Web smoke and other new-head CI checks must still pass.
D7 must reconcile debt dispositions and complete release review; the separate
stack audit follows the accepted baseline, before any Phase11 brainstorm/code.

## Remote verification of checkpoint f4b2346

All five checks pass atf4b2346: quality run39773064819 and containment
run39773064674 (both OSes). Downloaded api-e2e-report JSON independently
confirms590/590 across54 suites with zero pending/todo/runtime errors; retained
under node_modules/.cache/d6-ci-f4b2346. The run log is
dss-d6-ci-f4b2346.log in local temp. This does not include the subsequently
approved DEBT-049 schema alignment, whose own new-head acceptance remains open.

## Subsequent DEBT-049 local verification

Owner-approved source checkpoint9588857 preserves SQL and aligns Prisma
annotations, adds a read-only drift gate to quality/CI and passes full local
quality. Fresh coverage: API1298/1298, Worker50/50, Web60/60. Same-DB E2E:
593/593 in55 suites, zero pending/todo/runtime errors, natural test exit0.
Drift is empty before and after the tests; migrations/SDL are unchanged.
An npm fetch failure correctly stops the wrapper after E2E; a classified
network recheck passes security, followed by GraphQL consistency. The original
failure and all later results are retained, not described as one green wrapper.
See [detailed evidence](DEBT_049_PRISMA_SCHEMA_ALIGNMENT.md).
New-head remote checks and phase acceptance remain open.

## Subsequent full-gate and test isolation checkpoints

Remote checkpoint2ca6871 has all five checks green (quality39778289154,
containment39778289021). This predates the following local commits:
dcdd7e2 adds full gate, dc7adbe isolates Achievements fixture,9350e85 bounds Web
Vitest workers with owner approval and a real-config regression.

The full gate at9350e85 passes coverage(API1298/Web60/Worker50/Storage43),
E2E593/593 with no skips/todo/runtime errors, GraphQL consistency, build and
compiled API entry validation. It fails at its final fresh Web smoke12/13,
tracked as DEBT-077. No reset, retries, increased timeout or UI changes.
Earlier failed wrappers remain recorded under DEBT-015/075/076. No new remote
green status or full D6 acceptance is claimed for these local commits.

The owner then approved the DEBT-077 test-only observer-readiness package.
Focused controls2/2 and full fresh browser smoke14/14 pass (strict reporter,
no retries/skips/reuse). App/UI code, event expectations and timeouts are
unchanged. A final consolidated wrapper and remote CI are still required;
individual passing boundaries do not retroactively change earlier failed runs.

Checkpoint2a8948a contains the DEBT-077 correction. Its consolidated attempt
fails before tests because Next dev generated CRLF `next-env.d.ts`, an ignored
artifact incorrectly included in source formatting. DEBT-078 adds an exact-path
Prettier exclusion and an actual-ignore-policy regression; all five quality
controls and root formatting pass without editing the generated file.
Consolidated and remote acceptance stay open.
