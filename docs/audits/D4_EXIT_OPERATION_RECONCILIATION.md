# D4 exit operation reconciliation

Date: 2026-10-20. Base: `34f3ab640ead12882395ce335a834b89a10143de` / draft PR63.
Branch: `debt/d4-evidence-exit-reconciliation`. Partial, not D4 acceptance.

## Requirements and evidence standard

The execution plan requires narrow feature contracts, no foreign broad-service
injection, no business ORM, cycle-free graph and tested integration/idempotency.
The persistence matrix additionally leaves operation/context reconciliation
explicit. A source index, report mention, or zero static findings cannot prove
all semantics. Keep runtime implementation, source review, test evidence and
CI/owner acceptance separate. No new feature or correction is authorized here.

Current index: 47 non-test infrastructure files in Users20, Interactions12,
News10 and Reputation5. The index lists methods/functions, not only Prisma
imports; it includes SQL fragments, mappers, semantic delegates and matching.
It is discovery evidence, not a claim all 47 have been reviewed in this packet.

Current runtime fingerprint: 838 tracked non-test TypeScript files specifically
under `apps/api/src` and `apps/worker/src`, excluding declarations and
spec/test/e2e-spec files. Sorted path + newline + bytes + newline SHA256:
`540253afb7ae47fe167de5a6423646603b0e9098a8a6d522ec1c023be09cc449`.
Including scripts outside src yields a different inventory (853); do not mix
these scopes or silently replace the historical pre-transfer baseline.

## Users current source reconciliation

All twenty Users infrastructure sources were read at the above base, plus the
shared-row root persistence/role adapter, Users service, social/privacy/block/
Wall services, Wall interaction policy, GraphQL resolver/mapping/model and
request-scoped social loaders. This is not all 105 Users runtime files.

Paths below are relative to `apps/api/src/modules/users/infrastructure/`.

| Source group                                                  | Operations and current boundary                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| repositories/prisma-users.repository.ts                       | Eight semantic delegates; no Auth credential commands or direct foreign SQL                                    |
| repositories/prisma-profile-persistence.shape.ts              | Thirteen profile columns, ID/name/IDs predicates, five sort modes, directory query, ten-field update allowlist |
| repositories/prisma-viewer-profile.reader.ts                  | One semantic lookup then safe mapper; no second eligibility read                                               |
| repositories/prisma-profile-display.reader.ts                 | Username only, missing null, no eligibility inference                                                          |
| repositories/prisma-profile-existence.reader.ts               | ID only, any existing state                                                                                    |
| repositories/prisma-transactional-profile-existence.reader.ts | ID only on supplied root transaction                                                                           |
| repositories/prisma-public-profile.reader.ts                  | Distinct IDs, five public display fields including avatarMediaId; empty input skips SQL, no ACTIVE filter      |
| repositories/prisma-reputation-actor.reader.ts                | Four display fields, distinct IDs, empty input skips SQL                                                       |
| repositories/prisma-reputation-write-actor.reader.ts          | Same four fields, preserves empty compensation lookup stage                                                    |
| repositories/prisma-mention-profile.selector.ts               | Parameterized ILIKE candidates, ID/username only, excludes author; Auth ACTIVE filter is root-composed         |
| matching/mention-recipient.matcher.ts                         | Exact-first/unique accent-sensitive locale match; stable ID deduplication, no account-state policy             |
| repositories/leaderboard-profile.sql.ts                       | Fixed alias columns username/displayName/avatarUrl, no query/client lifetime                                   |
| repositories/prisma-registration-profile.shape.ts             | Copies only username/displayName                                                                               |
| repositories/unused-profile-asset.where.ts                    | Two absent profile-binding predicates, no IO; root Media composition consumes it                               |
| repositories/prisma-user-activity-context.reader.ts           | Interests first, parallel active follows/bidirectional blocks; three arrays, no invented Auth filter           |
| repositories/prisma-user-social-graph.repository.ts           | Reversible edge writes with Audit; independent grouped counts; batch list/count returning IDs                  |
| repositories/prisma-user-block.repository.ts                  | Block + both-direction active follow retirement + Audit in one transaction; IDs-only paging                    |
| repositories/prisma-user-privacy.repository.ts                | Own optional/batch reads and transactional upsert/Audit                                                        |
| repositories/prisma-user-social-links.repository.ts           | Ordered active links; transactional disable/upsert/Audit/final read; explicit returned fields                  |
| repositories/prisma-user-wall.repository.ts                   | Owned reads/batch paging; semantic write port; tombstones remove body/image in returned projection             |

Root profile composition combines Users/Auth/IAM fragments into the supported
sixteen display fields, preserving single reads and default batch directory
transaction. These are display facts, not an authentication authority. Prior
shared-row regressions remain relevant to query shapes and secret allowlists,
not proof of per-viewer privacy for every downstream projection.

### Context result: DEBT-070

The new full-App GraphQL fixture proves a social-list privacy divergence:
an outsider sees PRIVATE bio/location/interests via a public profile's followers
while direct userByUsername hides exactly those same synthetic fields. Auth
issues real credentials, fixtures use full migrations in a random schema, and
only that schema is dropped. Focused1/1 PASS, normal exit0; a passing defect
characterization is not a passing security contract. Production code unchanged.
The owner approved a separate pre-11 correction package on 2026-10-20; see the
debt register. Approval does not turn this characterization into acceptance.

Other limits remain explicit: follow checks block/privacy before its write;
per-operation transactions do not prove a concurrent follow/block invariant.
No deterministic concurrency proof or new race correction is claimed here.
Wall's own access/tombstone mapping and shared interaction policy stay owned;
DEBT-067 event ordering remains separate, not solved by projection review.

## Reputation current source reconciliation

All five current infrastructure sources, the service, resolver/module and all
six root infrastructure adapters/mapping units were read at the same base.

| Source under reputation/infrastructure/repositories/ | Methods/facts and schedule                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| prisma-reputation.repository.ts                      | policy upsert; policy update/Audit transaction; createDirect/reverse and original/history delegate to separate semantic ports        |
| prisma-reputation-entry.reader.ts                    | ordered original page, original lookup, original count, signed score, compensation facts; empty compensation IDs skip SQL            |
| prisma-reputation-total.reader.ts                    | all signed ledger entries including compensations, null sum zero, errors propagate                                                   |
| prisma-reputation.writer.ts                          | pair cooldown lock and strict gt; original reversal lock/unique compensation; projection before Audit/Outbox in supplied transaction |
| leaderboard-reputation.sql.ts                        | fixed-alias aggregate through endsAt, all signed values, no profile join or client lifetime                                          |

Root history retains the default transaction and sequence page → actors →
compensations → actors → total → score. Independent original lookup stays
independent. Root writes retain the default transaction and response projection
before evidence; the write-specific Users reader preserves the empty lookup.
Missing actor evidence throws, not partial-success response. Mapper associates
compensations by original ID and copies only four display fields.

Application checks self/vote/reason, Auth account state/age, Users block decision
and existence through narrow ports. Reverse/settings mutations have their named
permission guards; actor IDs come from AuthUser. Pre-write account/block checks
are not represented as an atomic revocation protocol. Source review adds no
fresh proof of every possible policy-change interleaving.

The [read](D4_REPUTATION_READ_OWNERSHIP.md) and
[write](D4_REPUTATION_WRITE_OWNERSHIP.md) reports describe prior 16 read and 23
write migrated regressions, including actual locks/rollback and field allowlists.
Those reports are prior-packet evidence. The current focused execution reran
both suites together with the new privacy characterization: 40/40 tests in
three suites, zero skipped, normal exit0 (2026-10-20T03:14:12.540Z start).
An earlier command requested a nonexistent reputation-read-ownership test path
and exited1; the corrected run uses reputation-history-ownership. That command
error is not a production regression and is not silently counted as a pass.
No current foreign actor SQL or broad service import was found in these five
owned adapters; that statement is not a whole-platform security certificate.

## Interactions current infrastructure reconciliation

All twelve current infrastructure sources were read, together with target
authorization/registry, comments/drafts, bookmarks, reactions, audience
engagement and moderation services, moderation transport, root comment-write
transaction, mention SQL composition and owner-policy bindings.

- Comments retain supplied transactions, per-comment edit locking, revisions,
  mention lifecycle and atomic Audit/Outbox. Recipient resolution composes
  Users candidates with Auth ACTIVE IDs in one root-owned SQL query.
- Drafts retain author/scope ownership and optimistic version CAS. Target
  registration preserves canonical identity and status evidence.
- Bookmarks serialize actor/target mutations; reactions serialize target writes
  and rebuild aggregates. Idempotent paths do not invent duplicate events.
- Moderation retains report/review and annotation lifecycle evidence. Staff
  guards remain distinct from ordinary readable-target authorization.
- Delivery reads stay on their supplied snapshot; comments read all target
  descendants after paging roots. No new bounded-work claim is made.
- The comment mapper spreads a persisted record before overriding tombstone
  fields; this is not an exact-field allowlist. It is not evidence of an
  external disclosure without tracing presentation and real response behavior.
- Engagement preserves guest visitor-key handling and target policy checks.
  News owner-policy bindings omit actor context; audience behavior on this route
  still requires reconciliation, not an unsupported security-pass assertion.

No runtime behavior was changed. Missing Passport coverage and existing
comment-delivery limitations remain separate D5/debt work.

## News current infrastructure reconciliation

All ten current News infrastructure files were read at the stated base. Root
delivery read-unit, viewer-document/search-batch and attachment/media-evidence
adapters, application delivery/attachment services and the interaction decision
contract were also read. This is bounded source review, not every News transport
or all workflow application policy.

| Source under news/infrastructure/repositories/ | Operations and boundary                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| news-search-eligibility.sql.ts                 | Parameterized publication/audience/taxonomy predicates and metadata match; no authored body fallback                                                                                              |
| prisma-news-search.session.ts                  | Repeatable Read selection; rejects stale/missing index evidence; transaction-local match table; gated candidates in batches of64 before count/pins/page; failures propagate, no hidden result cap |
| prisma-news-search-projection.repository.ts    | Keyset gap scan; installation compares version and full JSONB under row lock; upsert shares transaction; final gap count independent of scan cursor                                               |
| prisma-news-delivery.repository.ts             | Own content rows, cursor/numbered pages and pins; PUBLIC-only chronological neighbors; full related links and secondary targets filtered by viewer eligibility                                    |
| prisma-news.repository.ts                      | Owned row/editorial reads and mapping; create/save delegated to semantic cross-owner transaction port                                                                                             |
| prisma-news-workflow.repository.ts             | Status/version CAS, approval-version publication guard, decision and Audit/Outbox in one transaction; due candidates individually transitioned, not one all-candidate transaction                 |
| prisma-news-taxonomy.repository.ts             | Explicit category/tag/field writes with evidence; P2002 conflict mapping; owned existence/scope reads                                                                                             |
| prisma-news-links.repository.ts                | Owned create/list/remove and evidence; editorial list selects published targets, not a public viewer-safe delivery contract                                                                       |
| prisma-news-pins.repository.ts                 | Published/article-category checks, upsert/remove and evidence in transaction; no concurrency invariant inferred from transaction presence alone                                                   |
| prisma-news-settings.repository.ts             | Default row read; advisory-lock settings upsert with Audit/Outbox                                                                                                                                 |

Root delivery opens scoped Repeatable Read for composed pages/full/comments/
votes, hydrates only Users public display fields and Interactions-owned facts,
and fails on missing owner evidence. Navigation deliberately remains independent
News-only reads. Editor projection occurs after the content snapshot; it is not
claimed to share that database transaction. Full delivery replaces authored JSON
with the viewer projection before deriving attachments. Root attachment mapping
fixes News reference coordinates and copies published metadata, not storage
secrets. Related-link eligibility and secondary comment/vote audience filtering
are present; older DEBT-054/056 reproductions are not current unfixed findings.

The shared interaction decision contract contains no viewer identity. Its
audience behavior still needs an actual route-level characterization before
either a new defect or a security-pass assertion is justified.

Additional context traced in this packet: News draft/workflow/taxonomy, links,
pins and settings services; editorial resolver authorization methods, delivery
resolver operations, settings and pin resolver guards; all seven Interactions
resolver operation bodies and both module provider/export lists. News exports
only maintenance/interaction tokens; Interactions exports only comment-count/
policy-registration tokens. Ordinary actor IDs come from authenticated context,
not caller-nominated command fields. Engagement alone permits guest context.
Editorial full-document access is author or reviewer/publisher; staff workflow,
pin and settings operations enforce named permissions rather than role strings.

The root draft transaction still directly persists News rows/revisions/search
evidence and Media references while using the Interactions-owned target writer.
This matches the earlier D4.3b root transaction transfer contract; it is not
proof that every root persistence operation already uses owner-fragment adapters.
Create and save retain one transaction, save's author/status/version CAS and
atomic revision/reference/evidence writes. Media availability is checked before
that transaction; no concurrent Media lifecycle guarantee is inferred here.
Owner-fragment consistency across root writers remains explicit reconciliation,
not a silently expanded runtime change in this audit.

## Current verification checkpoint

Fresh API coverage reports 1169/1169 tests, 160 suites, zero skipped, 57.957s.
The workspace build reports six successful tasks (five cached), 17.551s.
The original shell handles are no longer available after continuation; these
are inspected terminal log/report results, not a newly observed shell exit.
Workspace lint and typecheck logs report nine successful tasks each; Prisma
validation reports a valid schema. Docker Engine was unavailable on continuation
(named pipe absent); the installed Desktop was started without changing its
configuration. The final local results below do not establish D4 acceptance.

The Engine subsequently reported29.8.2. The verified Compose project
`dss-universe-debt053-check` PostgreSQL container binds only127.0.0.1:5435 and
stores data on tmpfs. After starting it, public table count and other database
clients were both zero. Migrations completed before the full E2E launch; the
initial run was not accepted from a partial log. Dev5433 was untouched.

Fresh format gate exits1 (41 files), dependency audit exits1 (one high and ten
moderate advisories), Prisma generation exits0. These inherited red gates stay
open; no bulk formatting, dependency mutation or waiver is included here.
The owner's untracked STACK_AUDIT_PLAN retains its original SHA256 and is not
part of this packet.

E2E environment correction: the first run encountered closed Redis connections
because the test container on6380 remained stopped after Docker restart. The
identified Jest5784 was stopped, original shell exit-1 recorded, and that run is
not security/regression acceptance. The verified test Redis was started and
returned PONG. With zero PostgreSQL clients, only the verified disposable5435
tmpfs container was recreated; public table count0, migrations and Redis PONG
preceded a distinct retry report/log. Final results follow below.

Fresh adjacent checks exit0: Editor23, Storage43, Worker46, Web59 and dependency
patches14. Architecture/license/frozen-baseline command exits0 with140 tests and
zero inventory additions; this does not certify every runtime policy. Changed
files pass scoped formatting and diff checks. Parent draft PR63 remains open:
quality job CANCELLED, dependency audit and Web smoke FAILURE, both storage
containment jobs SUCCESS. No CI-green or merge claim is made.

Debt disposition remains bounded: DEBT-070 correction is approved separately;
DEBT-066 correction/design is approved but exact depth remains unapproved;
DEBT-067 ordering correction and DEBT-069 isolation proposal still await owner
decisions. DEBT-047 unique-owner/recovery policy remains unresolved. None is
silently resolved by this audit or zero static findings.

### Final E2E and consistency results

The retry JSON starts2026-10-20T16:32:45.631Z, after the actual process launch;
it is not a reused morning report. All510 tests execute:508 PASS,2 FAIL,
zero skipped,49 suites,417.831s. Failures are DEBT-045 News null/zero with its
retirement-trigger cleanup error and DEBT-048 App registration5000ms timeout.
App26/27, Reputation history16/16, Reputation writes23/23 and the new privacy
characterization1/1. The latter proves the vulnerable state, not correction.

After the completed report, zero other DB clients and zero api_boundary schemas
were verified. Only the exact completed Jest22360 with this outputFile was
stopped for retained handles; original shell exit-1 is not normal green exit.
No timeout increase, assertion weakening, forceExit or trigger bypass was used.
The invalid first Redis run remains preserved separately rather than hidden.

GraphQL generation succeeds but consistency exits1 on the inherited DEBT-044
generated barrel comment. Only that verification side effect was restored,
guarded against unexpected content; Git confirms no schema/operation output
diff. SDL SHA256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Scoped formatting/diff checks pass. Global format/audit/E2E/consistency gates
remain red; draft publication is evidence, not acceptance or permission to merge.

## Remaining evidence work

Follow-up at194e73b: [current Core/Worker delivery reconciliation](D4_CORE_WORKER_DELIVERY_RECONCILIATION.md)
reconciles selected current routing/claim/idempotency/retention boundaries and
adds eight actual migrated persistence bridge tests. Marker-gap replay and
ordered retraction are now DB evidence, not mock-SQL assertions. Full quality,
all-source/lifecycle/family disposition and acceptance remain separate.

Follow-up at406b874: [DEBT072 runtime correction](../development/DEBT_072_PROFILE_CLEANUP_IMPLEMENTATION.md)
locally applies the separately approved Media write guard/P2034 whole-batch defer.
Actual expanded39-case DB/HTTP regressions and API1225 pass; full E2E576/578
retains News/Leaderboards fixture failures. Full gate and review acceptance
remain separate. This closes neither overall D4 evidence work nor inherited reds.
Owner checkpoint2026-10-21: stop after actual D4 completion/report; later D5–D7,
stack audit and Phase11 require a new command, not automatic continuation.

Follow-up at47cd877: [root SQL / owner composition audit](D4_ROOT_OWNER_SQL_RECONCILIATION.md)
reads all18 current SQL-bearing root composition files, distinguishes approved
explicit root algorithms from guarded owner-fragment reuse, and characterizes
DEBT-072 through six actual migrated DB/HTTP schedules. Owner approved a separate
pre-11 design/correction package; this audit does not change runtime or claim
all transitive owner adapters/current-family acceptance. The reviewed root SQL
inventory is bounded and fingerprinted separately from the historical47-file map.

Follow-up at6eaf383: [News interaction audience audit](D4_NEWS_INTERACTION_AUDIENCE.md)
characterizes the viewer-less route and records DEBT-071 with actual guest /
invalid / revoked HTTP evidence. It does not fix the runtime or certify adjacent
Wall semantics; the earlier pending hypothesis below is now a separate finding.

- Complete verification/review acceptance for the separately implemented
  [DEBT-071 correction](../development/DEBT_071_NEWS_INTERACTION_VIEWER_IMPLEMENTATION.md)
  and reconcile remaining root owner-fragment consistency; no unsupported
  adjacent vulnerability claim. Local runtime progress is not full D4 closure.
- Cross-cutting root/Core/Worker references and existing seventeen-family report
  dispositions; distinguish historical findings from separately implemented fixes.
- CI/independent review and resolution of inherited format/audit/E2E/drift debt;
  current local graph/surface and scoped checks do not waive these gates.
- Complete CI/review acceptance for the separately implemented
  [DEBT-070 correction](../development/DEBT_070_SOCIAL_PROFILE_PRIVACY.md), not by
  marking this audit's intentionally vulnerable historical assertion as acceptance.
- D5/D6/D7, owner stack-boundary audit, then required Phase11 brainstorm remain.
