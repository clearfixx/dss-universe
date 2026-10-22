# DEBT-049 — Preserve existing SQL while aligning Prisma

Date: 2026-10-22. Separate owner-approved D6 package.
Status: local quality/coverage/E2E verified; new-head CI/review open.

## Reproduction and approved boundary

After all54 migrations, read-only Prisma diff still detects twelve updatedAt
defaults, native Outbox ID type and two Users indexes. The retained initial
log is `dss-d6-schema-drift-current.log`: Prisma reports nonempty exit2, while
the enclosing pnpm recursive wrapper returns1. This is not an applied repair.

PostgreSQL catalogs confirm all twelve defaults are CURRENT_TIMESTAMP,
outbox_events.id is uuid, and the two ordinary B-tree Users indexes already
exist on loginLockedUntil and (status, deactivatedAt).

Owner approved preserving this SQL schema. Only missing model annotations are
added: twelve @default(now()) alongside retained @updatedAt; @db.Uuid alongside
Outbox's existing String ID/default; two named @@index declarations. No old
migration is rewritten, no repair DDL/new migration/data conversion is run,
and no index/default/PK is removed. Temporary test schemas still apply the
complete unchanged migration history and are dropped by their owned fixture.

The new db:check-drift command only compares configured DB and schema, failing
closed on differences. Root quality invokes it; CI invokes it after migration
deployment. It never pipes generated SQL to db execute or mutates the database.

## Focused evidence

- Schema format/validation and client generation pass.
- Read-only diff from both disposable5435 and5434 now says No difference
  detected, natural exit0. Logs: dss-d6-schema-drift-aligned.log and
  dss-d6-schema-drift-unit-db.log in local temp.
- Fourteen static schema-contract tests preserve all twelve default/update
  annotations, UUID representation and named indexes. This is source evidence,
  not a claim that reduced runtime DMMF exposes every schema annotation.
- Three fully migrated DB cases verify every catalog default/index, client
  create with omitted timestamp, retained automatic update after an explicit
  old sentinel, direct SQL default, and actual UUID Outbox create/read/update.
  CRUD is representative, not every business use case or every model.
- Focused logs: dss-d6-schema-contract.log (14/14) and dss-d6-schema-db.log (3/3).

Full combined gates and new-head remote CI remain required. Previous checkpoint
f4b2346 has five green remote checks and downloaded E2E590/590, but that evidence
does not include this schema/guard correction. No Phase11 readiness is claimed.

The first full quality attempt stops on two unsafe-assignment lint findings
from Jest's asymmetric string matchers in the new test. Explicit typed field
comparisons replace those matcher-valued object properties; no rule is
disabled and the index assertions remain. The failed log is retained as
`dss-d6-schema-quality.log`; full verification is repeated after this correction.

The corrected full `pnpm quality` naturally exits0: formatting, lint, types,
Prisma validation and empty read-only drift check,33 profile controls,
API1298/1298 in171 suites, workspace tests, build/production-entry check,
license/architecture140/140 with zero findings. Final log:
`dss-d6-schema-quality-final.log`. Fresh coverage/full E2E, final consistency
and security checks and new-head CI remain open; no merge is claimed.

## Final source-checkpoint verification

At9588857, a newly recreated disposable5435 DB receives the unchanged54
migrations; read-only drift is empty before tests. Full coverage passes
API1298/1298 in171 suites, Worker50/50 and Web60/60, seven fresh tasks with
zero cached results,1m45.453s. Full E2E then passes593/593 in55 suites,
464.359s, without a reset between stages. JSON confirms success with zero
failed/pending/todo/runtime errors. DB clients/private schemas are released;
SDL SHA256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.

The pipeline wrapper subsequently exits1 because npm audit returns fetch
failed, not because tests fail. This failed evidence is retained. A separate
diagnostic audit returns a complete report (one existing high,12 moderate,
zero critical); a bounded security-gate network recheck naturally exits0,
verifying the exact accepted braces patch/advisory exception. No new exception,
cached audit substitution or test rerun is used. GraphQL consistency then
passes, and a post-E2E drift check is still empty. Migration/client/SDL outputs
have no unplanned tracked diff.

Final local temp evidence: dss-d6-schema-migrations.log,
dss-d6-schema-drift-fresh.log, dss-d6-schema-coverage.log,
dss-d6-schema-e2e.log, dss-d6-schema-security.log (original fetch failure),
dss-d6-schema-audit-diagnostic.json, dss-d6-schema-security-network-recheck.log,
dss-d6-schema-graphql.log and dss-d6-schema-drift-after-e2e.log.
Full JSON is retained in node_modules/.cache/d6-schema-e2e.json.
These results do not constitute new-head clean remote CI or phase acceptance.
