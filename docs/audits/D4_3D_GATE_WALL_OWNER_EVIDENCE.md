# D4.3d1 — Gate and Wall owner evidence

Date: 2026-10-14. Branch: `debt/d4-module-boundaries`, draft PR #10.
Increment base: `1b189d7`. Implementation locally verified; review/final-head CI
acceptance OPEN. This is the first owner-SQL increment, not completion of D4.3d,
D4 or the pre-Phase-11 goal. Parent D3.5 PR #9 remains unaccepted.

## Ownership and preserved semantics

Content Access persistence now creates/reads only its gate definitions and
requirements. Viewer facts move into a private owned application service, consuming
three separately owned input ports. Root adapters connect existing minimal Auth
account evidence, a new Interactions comment-count reader and a new Reputation
signed-total reader. No sibling implementation or ORM client enters application
contracts. Explicit published tokens are the only new Nest integration exports.

Auth retains status/creation-time ownership. Content Access rejects missing or
inactive accounts before starting either scalar read and computes exactly the old
floor/clamp account-age formula. Interactions counts authorId plus deletedAt=null,
including comments whose parent target is locked; no new lifecycle/audience
filters. Reputation sums every recipient entry, including compensating reversals
and negative totals; only a null sum becomes zero, never a provider failure.

The five-statistic projection excludes groups, profiles, credentials and history.
Authorization remains the sole source of groups/Premium. Existing Forum/publication
zero placeholders remain explicit; those product ledgers are not newly implemented.
ALL/ANY, audience-before-bypass, author preview, Premium numeric-only bypass and
guest/missing/inactive outcomes are unchanged. Existing independent Promise.all
reads are retained; no snapshot consistency or stronger concurrent status check
is claimed.

Users Profile Wall now consumes its own image-decision port after existing
profile/block checks. Media owns the exact id/ownerId/IMAGE/READY/deletedAt=null
query and publishes Boolean only. All four existing visibility values remain
eligible under this rule, including private images. No path, storage key, file
metadata or full Media row crosses the contract.

The image check remains a pre-write read, as before. Existing root Wall unit of
work is unchanged: target/post/reference/audit/outbox writes remain atomic, and
tombstone redaction/reference retirement are retained. This transfer does not
claim to close a pre-existing check/write race or invent owner visibility rules.

No API/GraphQL schema, migration, dependency, frontend, scoring, Command Deck or
Phase 11 feature changes. Backend architecture guidance was applied to preserve
the established NestJS/Prisma stack and explicit owner ports, not change hosting.

## Evidence and verification

- Full serial opt-in unit/integration: API 716 / Web 59 / Worker 36 PASS.
- New owner-evidence E2E: 24 PASS with actual AppModule providers and all 53 real
  migrations in a disposable owned schema.
- Complete relevant D4 E2E rerun: 111 PASS across eleven suites, including the
  existing Activity Feed transport tests; no full API/Web E2E acceptance claimed.
- Full scoped coverage: PASS (API 624 passed / 92 opt-in cases separately verified;
  Web/Worker/Storage exit 0 with unchanged thresholds).
- Production build: PASS, serial `--concurrency=1`; API fresh, five unchanged builds cached.
- Lint/typecheck: PASS; no disabled rules. Final static checks repeated before commit.
- Architecture/license/baseline: PASS, 50 AST fixtures, unchanged 89 import
  findings, no additions/exemptions. Three new bounded AST tests pin direct owned
  delegates in the migrated repositories and characterize computed/client escape
  detection. This is not an exhaustive table-ownership analyzer.
- Prisma validation/status: PASS, 53 current migrations, no schema/migration change.
- Changed-file format/Passport/diff whitespace: checked before commit.
- Global formatting RED: same 41 legacy files (DEBT-022).
- Generated consistency RED: only the inherited barrel lint comment (DEBT-044);
  restored only the codegen side effect from the initially clean file. No frontend
  or GraphQL schema diff remains.
- Dependency audit RED: 1 high / 10 moderate (DEBT-016); 14 patch regressions PASS,
  not an audit waiver.
- Full API/Web E2E, final-head CI and review remain OPEN.

The 31 added pure tests verify exact query shapes, no extra fields, nullable/missing
evidence, signed totals, age boundaries, inactive short-circuit and provider errors.
Existing policy units and seven PostgreSQL audience tests consume the real new
owner readers/root adapters, not synthetic replacement statistics.

New E2E covers scalar fixtures and signed reversals; inactive accounts before author
preview; authenticated GraphQL gate evaluation and Wall creation; every image status,
foreign/system/non-image/deleted/missing files; both block directions; atomic reference
creation and tombstone retirement; and fail-closed provider errors before post writes.
Binary files are metadata fixtures, not a claim of physical upload verification.
Comment/ledger fixtures do not claim to exercise their unchanged creation workflows.

Two initial fixture runs correctly failed existing comment CHECK constraints;
the fixture was repaired with canonical COMMENT document/search text and complete
tombstone deletion attribution. Constraints and immutable-history triggers were not
disabled. Expected provider failures retain Promise.all early rejection, so the
new test explicitly drains the still-real sibling count/audience reads before
closing the DB. Real presence side effects are also awaited; no production provider
is replaced with a success fallback or arbitrary sleep.

A post-regression query confirms zero remaining `api_boundary_*` schemas. Only
owned disposable schemas were removed; dev/production data was not changed.

## Remaining source-reviewed SQL ownership

See [D4 plan](../development/D4_MODULE_BOUNDARY_PLAN.md) for the sequence:

1. Activity feed context directly reads Users interests/follows/blocks.
2. News delivery directly joins Users presentation, Media references/full rows and
   Interactions aggregates/bookmarks/comments/views; direct sharing/reaction/comment
   projections remain.
3. Comment mentions resolve active Users handles inside their evidence transaction.
   Preserve atomicity; moving resolution to an unprotected pre-read is not acceptable.
4. Reputation history joins Users display fields; Users still reads IAM roles and
   transitional shared rows. Transaction-local subject checks in Achievements, Custom
   Titles and IAM require explicit disposition during D4.3/D4.4.
5. Complete remaining relation/delegate/raw-SQL and Worker projection review before
   D4.5; this starting inventory is not an exhaustive certificate.

These are in-scope D4 obligations, not newly waived or silently closed defects.
D4.4/D4.5 and D5–D7 remain required. Stop before Phase 11 for its mandatory brainstorm.

At the preceding `1b189d7` CI snapshot, Windows/Linux storage passed, audit/Web smoke
failed and the main quality job remained authoritative IN_PROGRESS at API E2E.
No manual restart/cancellation was performed. New-head CI must be evaluated separately.
