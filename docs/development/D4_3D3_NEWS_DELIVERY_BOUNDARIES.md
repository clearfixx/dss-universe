# D4.3d3 — News delivery ownership and snapshot contract

Date: 2026-10-14. Status: owner-approved direction; foundation followed by locally
implemented [D4.3d3b](../audits/D4_3D3B_NEWS_OWNED_SNAPSHOT.md). Acceptance open.

## Baseline and authority

Branch: `debt/d4-news-delivery-boundaries`, based on published DEBT-051
`ae144bccfb315202c181603f7eac492b2d841796` / draft PR #14. Parent PRs remain
unaccepted. Existing ADR-003/004 and the full D4 plan apply; no red merge.
The owner-authored untracked stack-audit plan stays separate.

On 2026-10-14 the owner explicitly approved a root-infrastructure unit of work
with owner adapters and Repeatable Read for composed News responses. This is an
explicit strengthening of current default Read Committed, not a claim that old
transactions already provided one immutable snapshot. Global DB isolation,
timeouts, cross-request caches and public API shapes are not changed by approval.
ORM clients stay exclusively inside infrastructure, never business contracts.

The owner also approved priority separate DEBT-056 before runtime SQL transfer.
DEBT-057 tombstone transport is recorded but not approved for correction here.

## Baseline operation map (before DEBT-056 and D4.3d3b)

| Operation                      | Current persistence/consistency                                                                    | Required owner transfer                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Cursor browse without search   | Pins then rows, independent calls; nested author/engagement relations                              | News selection + Users display + Interactions facts in one reviewed read UoW           |
| Numbered browse without search | Pins separately; rows/count in default transaction                                                 | Same page/pins/total semantics, one approved snapshot                                  |
| Search browse                  | Existing Repeatable Read/temp match relation and viewer-safe Editor batches                        | Retain News search algorithm and all matches; hydrate owner facts in the same read UoW |
| Full article                   | Eligible rows, full record/related then share counts; document/attachments composed in application | News owns content/audience/links; Users display and Interactions shares stay owned     |
| Rating page                    | News flag/status pre-read, reaction rows/count transaction, nested actor display                   | News access first; Interactions votes/count, Users allowlisted display                 |
| Comment page                   | News flag/status pre-read; roots/count/all target rows transaction                                 | News access first; Interactions tree/engagement/tombstones, Users allowlisted display  |
| Chronological navigation       | News-owned current/neighbor selection                                                              | Keep News-only selection and existing public-neighbor policy                           |

Nested Prisma relation selections are not assumed to be one physical SQL JOIN or
one database statement. Inspect actual execution during implementation rather
than claiming consistency from the ORM call's shape.

## Approved composition design

News publishes operation-specific semantic inputs/results, not a Prisma query or
generic callback. Root infrastructure coordinates stateless, infrastructure-only
owner adapters through the guarded technical-entry convention already in ADR-004.
News retains its owned filters, pins/search/links/content. Users retains display
field selection; no account credentials/status/roles enter display projections.
Interactions retains comments, votes, counts, bookmarks, views and shares.

The root read unit opens an explicitly scoped Repeatable Read transaction and
passes its client only to those technical persistence adapters. Ordinary module
roots must not re-export them; feature/business imports remain forbidden. Do not
move foreign SQL wholesale into a renamed News facade or generic query framework.

Root assembly provides the News-owned semantic delivery port. Feature services
cannot import root infrastructure or another owner's private repository. Keep
ordering, root/reply construction, nullable tombstone domain fields, numbering,
cursors, pins, eligible totals and fail-closed provider errors explicit. No N+1
author reads or silent truncation. Missing required evidence is not fabricated.

Existing search ContentAccess scopes keep their separately approved live-evidence
boundary. A PostgreSQL content snapshot is not an ACID authorization snapshot
across independent evidence ports, nor a new revocation cache. No authored body
fallback, permission-by-role-name check or increased transaction budget.

Before publishing implementation, prove real concurrent edits do not mix owner
facts in a response; provider failure aborts the operation; query work is bounded
per page/batch rather than per author; all previous redaction and media policy
regressions remain green. Full D4 also requires remaining mention/role/shared-row
ownership, public exports, ORM isolation and D5–D7; this package does not replace them.

## Verified foundation evidence

Actual disposable PostgreSQL reports `default_transaction_isolation = read committed`.
Prisma core and current numbered/rating/comment transactions do not override it;
News search explicitly uses Repeatable Read.

`news-delivery-boundary-characterization.e2e-spec.ts`: **6 PASS**, zero skipped,
normal exit, real AppModule/all migrations in an owned schema. Two probes use a
separately committed writer: a first nested read sees the initial author name;
the later owner read sees the changed name under Read Committed and the initial
name under Repeatable Read. The writer's commit is separately verified. No sleep,
mock authorization, timeout extension or production isolation change.
These probes establish database behavior, not a completed runtime migration.
See [PostgreSQL 17 isolation documentation](https://www.postgresql.org/docs/17/transaction-iso.html).

At foundation commit `6cdfbd4`, three additional characterizations confirm DEBT-056 guest MEMBERS comments/votes
and DEBT-057 valid-tombstone GraphQL failure; a PUBLIC guest control passes.
Positive disclosure/error assertions are diagnostic evidence, never acceptance.
The separate [DEBT-056 correction](DEBT_056_NEWS_SECONDARY_AUDIENCE_PLAN.md) reverses
its two disclosure assertions and adds audience regressions. DEBT-057 remains
explicitly open until separately approved. Only synthetic data is inspected.
