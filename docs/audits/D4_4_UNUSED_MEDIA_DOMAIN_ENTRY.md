# D4.4 — Remove the unused Media domain aggregation entry

2026-10-19. Branch `debt/d4-unused-media-domain-barrel`, parent `b1df20c` / draft
PR #52. Authorized bounded D4.4 cleanup, not Phase11 or an accepted baseline.

## Discovery and bounded change

The former `apps/api/src/modules/media/domain/index.ts` re-exported seventeen
owned files with wildcards, including entities, enums, repository bindings and
data types. Current consumers use their explicit owner paths or the reviewed
Media public contracts. Read the entry, current path aliases and existing source
references before deleting it.

A tracked-source AST scan of apps/packages/scripts covers import/export module
specifiers, import types, literal dynamic imports, require and require.resolve.
It resolves the repository's `@api/*` alias and relative paths, including explicit
index/extensions, and finds zero literal consumers of this entry. Computed module
names, custom loader aliases, untracked/generated and external consumers are not
proved absent by that bounded scan. Relevant Media/root source search found no
computed import/require entry; complete build and migrated E2E remain necessary.

Delete only the unused aggregation file. Keep all seventeen target files, Media
public contracts, Nest providers, persistence and transport unchanged. Do not
replace an unused barrel with a new public inventory of internal repositories.
The deleted file is recoverable from Git; no user content/storage is deleted.

No behavior, policy, schema, migration, event, retry, timeout, UI or provider change.
This does not claim global Media security or LOCAL/S3 parity.

## Regression evidence

Three new architecture cases pin entry absence, existence of all seventeen owned
targets and zero tracked literal imports of the removed entry. Before removal,
the new cases have2 PASS/1 FAIL (entry still exists); afterward all3 pass and the
full architecture suite passes95/95. Existing rules are not relaxed.

Exactly seventeen reviewed baseline findings for this file are manually removed,
**53 → 36**, no additions/regeneration. All remaining entries are Core wildcard
exports; bounded syntactic inventory does not certify full D4 ownership.

Full source gates, API opt-in coverage, adjacent tests and format/audit are
running. Serial disposable full E2E, GraphQL, CI/review/owner acceptance remain
pending. Existing DEBT-044/045/059/global red checks are not waived. Full D4
operation reconciliation/enforcement, D5–D7, stack audit and Phase11 brainstorm
remain required.

## Pre-full-E2E verification

Full API opt-in coverage **1138/1138**, 155 suites, zero skips, 83.389 seconds,
normal exit0. Root lint/types/build pass9/9/6 tasks (39.724s/28.802s/27.149s);
Prisma validation and architecture/license checks pass. Editor23/Storage43/
Worker46/Web59/dependency-patch14 pass. Global format41 inherited files and audit
1 high/10 moderate remain red; no waiver or unrelated formatting/dependency edit.

All pre-E2E command processes terminal. Verified exact Docker disposable project/
service, sole loopback5435 binding and tmpfs plus zero clients; recreated only
that service, verified empty public schema and applied migrations without seed.
Dev5433 and persistent test5434 not reset. Serial full E2E running; GraphQL/CI/
review/owner acceptance pending. No full-green/debt closure claim.
