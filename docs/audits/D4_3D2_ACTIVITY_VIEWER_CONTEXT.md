# D4.3d2 — Activity viewer context ownership

Date: 2026-10-14. Branch: `debt/d4-module-boundaries`, draft PR #10.
Increment base: `2eda2a6`. Implementation locally verified; final-head CI/review
acceptance OPEN. This does not complete D4.3d, full D4 or pre-Phase-11 readiness.
Parent D3.5 PR #9 is still unaccepted; no red PR is merged.

## Ownership transfer

Users publishes only interests, followingIds and blockedIds through one minimal
readonly contract. Its private infrastructure reader selects exactly the old
interest/follow/block columns and maps both block directions to the other ID.
No credential, profile, status, roles, relationship timestamps or persistence
record enters Activity. The root adapter selects/copies all three arrays, with
no successful empty fallback on failure. Activity consumes its separately owned
input port, not a sibling implementation.

Preserve profile-before-parallel-relationship reads, non-retired follow/block edges,
missing-profile empty interests while still reading edges, and no new ACTIVE or
profile-privacy filter. Context is internal personalization evidence, not proof of
authentication: the unchanged viewer GraphQL guard still rejects anonymous access.
The direct internal feed call's previous missing-viewer behavior is explicitly
characterized rather than silently changed.

Activity application now captures generatedAt, reads its own visit state, requests
Users context and finally reads candidates, in the same ordering as before.
Guests skip state/context entirely. The repository contains only Activity
entry/state persistence and primitive metadata mapping. It receives blocked actor
IDs, applies the same retraction/visibility/module predicates and takes the most
recent 500 candidates before ranking. No foreign table or raw User context query
remains there.

Reason/score/rank/pagination policy moves to a private Activity application service,
not a generic cross-module facade. Preserve own-before-mention reason selection,
mention/follow/interest/own/recent score weights, clamped age bonus and rounding,
descending timestamp/locale-ID ties, post-ranking pagination, total unread across
all bounded candidates and strict occurrence-after-visit comparison.
Reads do not mark visits; the explicit server-timestamp mutation remains unchanged.
No cache, snapshot transaction, event ingestion, moderation or audience policy is
introduced. Scalar/owner/storage errors propagate rather than allowing or returning
an empty successful feed.

No API/GraphQL schema, Prisma model/migration, dependency, frontend, Command Deck,
scoring formula or Phase 11 feature changes. Backend guidance was used to preserve
the established NestJS architecture and assign policy/persistence to their owners.

## Verification

- Focused units: 53 PASS across five suites.
- New migrated AppModule E2E: 17 PASS. Real owner contracts, follow/unfollow/block
  use cases and PostgreSQL, not success-stubbed policy/read providers.
- Six AST-printer comparisons against the increment base match exactly: reason,
  score, sort callback, metadata mapping, actor reads and markVisited.
- Root lint/typecheck: PASS; no rules disabled.
- Architecture/license/baseline: PASS; 51 fixtures, unchanged 89 import findings,
  no new findings/exemptions. Bounded direct-Prisma regression now pins Activity
  to its own delegates; no exhaustive SQL-ownership certificate is claimed.
- Full serial opt-in units: API 755 / Web 59 / Worker 36 PASS; all API DB/Redis
  opt-ins enabled.
- Complete relevant D4 E2E: 128 PASS across twelve suites, including the existing
  Activity Feed transport tests; not full API/Web E2E acceptance.
- Full scoped coverage: PASS (API 663 passed / 92 opt-in cases separately verified;
  Web/Worker/Storage exit 0 with unchanged thresholds).
- Production build: PASS, serial `--concurrency=1`; API fresh, five unchanged builds cached.
- Prisma validation/status: PASS, 53 current migrations and no schema change.
- Changed-file Passport/format/diff check: PASS; final static rerun before commit.
- Global formatting RED: same 41 legacy files (DEBT-022).
- Generated consistency RED: only the inherited barrel lint comment (DEBT-044);
  restored only the codegen side effect from the initially clean file. No frontend
  or GraphQL schema diff remains.
- Dependency audit RED: 1 high / 10 moderate (DEBT-016); 14 patch regressions PASS,
  not an audit waiver. Full API/Web E2E, final-head CI and review stay OPEN.

Thirty-nine added pure tests characterize exact owner query projections, both
block directions, missing profile, age-independent context, array copies, ordered
reads and failure propagation; owned Activity queries/cap and metadata filtering;
reason precedence, rounded scores, deterministic ties, unread/pagination and guest
short-circuit. Existing actor-summary and provider-privacy regressions remain.

New E2E proves exact minimal context, all account statuses without inventing
eligibility policy, missing internal viewer versus protected transport, live
interest/follow/block/retraction changes, PUBLIC/MEMBERS/PRIVATE handling,
normalization, explicit visits, unread count before pagination and the 501-row
boundary excluding an old high-ranked actor from the first 500 candidates.
GraphQL preserves ISO timestamps and omits metadata/context/credential fields.
Injected provider errors return no successful feed and skip candidate reads.

Fixtures use all 53 real migrations in an owned disposable schema; Activity rows
are projection fixtures, not a claim of producer/Worker ingestion verification.
Only unused Shiki highlighting is substituted for Jest compatibility. Real
presence refreshes are awaited before cleanup, not replaced with success/no-op.
No immutable-history trigger or SQL constraint is disabled.

A post-E2E query confirms zero remaining `api_boundary_*` schemas. Only owned
disposable schemas were removed; dev/production databases were not changed.

At the preceding `2eda2a6` CI snapshot, Windows/Linux storage passed, audit/Web
smoke failed and the main quality job remained authoritative IN_PROGRESS at API
E2E. No manual restart/cancellation was performed; evaluate new-head CI separately.

## Remaining work

Next D4.3d3: News delivery directly joins Users author presentation, Media
references/full rows and Interactions aggregates/bookmarks/comments/views, with
direct sharing/reaction/comment projections. Split owner contracts/root
composition while preserving audience, filtering, query ordering, pagination,
redaction and physical file access.

Transactional comment mention resolution, Reputation display/history joins, Users
IAM role/shared-row reads and transaction-local subject checks still require
explicit ownership disposition in D4.3/D4.4. Complete relation/delegate/raw-SQL and
Worker projection review before D4.5. See the
[D4 plan](../development/D4_MODULE_BOUNDARY_PLAN.md).

D4.4/D4.5 and D5–D7 remain required. Stop before Phase 11 for mandatory brainstorm.
