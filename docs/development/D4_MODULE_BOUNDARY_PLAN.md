# D4 — Cross-module boundary remediation

Date: 2026-10-14. Status: authorized debt-remediation execution, not Phase 11.
Branch: `debt/d4-module-boundaries`.
Implemented increments: D4.1, D4.2 and bounded D4.3a/b/c/d1/d2/d3a plus AI Core/private feature/representation/presentation/News D4.4; remaining import inventory 53,
full D4 and the rest of D4.3 OPEN.
Locally implemented D4.3d3b transfers the mapped News delivery SQL into owned
adapters and a scoped root snapshot; full acceptance remains open. Evidence:
[approved read-boundary foundation](D4_3D3_NEWS_DELIVERY_BOUNDARIES.md),
[D4.3d3b local ownership/snapshot evidence](../audits/D4_3D3B_NEWS_OWNED_SNAPSHOT.md),
[D4.3d3a evidence](../audits/D4_3D3A_NEWS_ATTACHMENT_METADATA.md),
[D4.3d2 evidence](../audits/D4_3D2_ACTIVITY_VIEWER_CONTEXT.md),
[D4.3d1 evidence](../audits/D4_3D_GATE_WALL_OWNER_EVIDENCE.md) and
[D4.3c evidence](../audits/D4_3C_POLICY_MEDIA_ACTIVITY_CONTRACTS.md).
Review stack base: `173358d` / draft PR #9. Parent acceptance is still pending;
no red PR is merged and this branch is not an accepted release baseline.
Authority: approved pre-Phase-11 D4 plan and ADR-003/004.

## Outcome and invariants

Close the full D4 inventory, not merely rename broad services into facades.
Starting inventory: 135 findings; latest reviewed inventory: 53. Every reduction needs exact source,
behavioral and contract evidence; no automatic baseline growth or waiver.
Keep NestJS, Prisma, PostgreSQL, Outbox/BullMQ and existing transport responses.
Do not invent frontend design, new scoring formulas, owner policy or Phase 11 flows.

## Implementation sequence

News surface increment (2026-10-19): all15 root wildcards removed; exact named
integration/data contracts retained. Nine services/six repositories stay local,
Nest exports only two existing tokens. One E2E fixture's six service imports move
to private paths, assertions unchanged. Four boundary cases2 PASS/2 FAIL before,
4/4 after; inventory68 →53, no additions. Full gate/acceptance pending; see
[evidence](../audits/D4_4_NEWS_EXPLICIT_SURFACE.md). This does not close full D4.

Owner-approved composition increment (2026-10-19): root presentation owns the
shared content wire enums and four unchanged operations through four narrow
capabilities. Feature policy/redaction remain private; no sibling imports or
presentation Prisma. Fourteen new unit cases plus five existing boundary cases
pass; inventory 70 → 68 with zero additions. Full gate/HTTP/acceptance pending;
see [evidence](../audits/D4_4_CONTENT_PRESENTATION_COMPOSITION.md). Remaining
68 wildcard findings and full operation reconciliation are not waived.

Representation increment (2026-10-19): Users directory retains its ACTIVE filter
without a Prisma presentation import; configuration retains its complete Joi
schema through an explicit default binding. Seven new regressions pass after
5 PASS/2 FAIL baseline; inventory 72 → 70, no additions. Full gate pending; see
[evidence](../audits/D4_4_USERS_CONFIG_REPRESENTATIONS.md). Owner requires root
presentation composition, not a sibling enum import, for the two remaining
Content Access/Editor Prisma surfaces; [design](../audits/D4_4_CONTENT_GRAPHQL_COMPOSITION_DESIGN.md)
is proposed only, not implemented. Full D4 scope is unchanged.

Further D4.4 increment (2026-10-19): nine unused concrete service exports removed
from Custom Titles, Leaderboards and Interactions; existing input/read/registration
contracts retained. Nine boundary tests pass after 3 PASS/6 FAIL baseline;
inventory 81 → 72, no additions. Full gate/acceptance pending; see
[evidence](../audits/D4_4_PRIVATE_FEATURE_SERVICES.md). Remaining wildcard/ORM and
full source-operation reconciliation are not waived.

Bounded D4.4 follow-up (2026-10-19): AI Core now exposes only its named assembly
module, with command service/provider private. Three focused boundary regressions
pin the surface; reviewed AST inventory 84 → 81, no additions. Full gate and
acceptance are pending; see [evidence](../audits/D4_4_AI_CORE_EXPLICIT_SURFACE.md).
This does not complete remaining D4.3 operation reconciliation or full D4.4/D4.5.

1. **D4.1 — Gamification read boundaries.** Community Points, Levels and
   Achievements consume their own recipient-existence ports. Users publishes
   an ID-only profile-existence contract; Levels reads balance through a
   published scalar Points contract adapted at the root. No profile, credentials,
   roles or ORM rows cross these boundaries. Remove the three concrete public
   service exports and Nest provider exports; tests may access owned internals.
2. **D4.2 — Reputation and Media composition.** Replace broad Users/block reads
   with operation-specific evidence. Keep eligibility/age ownership explicit.
   Move combined avatar/cover plus profile responses into presentation composition.
3. **D4.3 — Content integration.** Isolate Editor/Content Access, interactions,
   News/Media and activity ports, preserving redaction, atomic target lifecycle,
   policy registration and idempotent outbox semantics.
4. **D4.4 — Explicit surfaces and ORM isolation.** Remove remaining wildcard and
   namespace exports/imports; retain only justified named public contracts.
   Replace non-infrastructure Prisma representation leaks with owner types/mappers.
5. **D4.5 — Enforcement and acceptance.** Review the reduced inventory and cycles,
   block regressions, run full gates, publish review/CI evidence and resolve findings.

This sequence is not a reduction of D4 scope. Partial increments remain explicitly
incomplete until every exit requirement is verified.

## D4.1 semantic characterization

Existing `UsersService.exists` loads a full user record then returns Boolean.
The new ID-only read must preserve existence, including inactive accounts; it is
not an authentication eligibility decision and must not introduce new status policy.
Missing returns false; storage errors propagate, never synthesize existence.
Current authoritative balance stays synchronous; no new cache/projection is used.
Points deduplication/reversal/caps, level transitions and achievement rule routing
remain in their owners. Provider contracts expose neither consume commands nor
repositories to downstream Levels.

## Verification

The D4.3c execution also closes remaining Media/Activity reads: Media publishes
only owner/public/ready evidence (no paths/keys/metadata); News owns draft/readiness
policy through its own port. Preserve draft attachment access even for non-ready
media when the existing owner/public rule permits it; only review/publication
requires ready and public. Do not invent cover validation or new audience rules.
Activity publishes actor summaries without visibility/metadata/body fields; Users
owns profile/block authorization before its projection-read port. Preserve existing
pagination, active PUBLIC/MEMBERS filtering and retraction semantics.

### D4.3d1 — Gate and Wall owner evidence

Content Gate persistence now reads only gate definitions. Its private application
fact service consumes three separate owned ports: account eligibility/createdAt,
comment count and signed Reputation total. Root adapters bind published Auth,
Interactions and Reputation readers. Missing/inactive accounts short-circuit both
counts; exact floor/clamp age math, non-deleted global comment counts and all-entry
reputation sums are preserved. Groups/Premium remain Authorization-only; Forum and
publication counters retain the existing explicit zero placeholders, not a claim
of completed ledgers. Counts and audience still use independent parallel reads,
not a new snapshot transaction or cache.

Profile Wall consumes its own image-eligibility port after privacy/block checks;
Media owns the exact owner/IMAGE/READY/non-deleted query and publishes only Boolean.
All existing visibility values remain eligible under that rule. The read stays
before the unchanged atomic Wall transaction; no new race protection is claimed.
See [D4.3d1 evidence](../audits/D4_3D_GATE_WALL_OWNER_EVIDENCE.md).

### D4.3d2 — Activity viewer context

Users now publishes only interests/followingIds/blockedIds through a minimal
reader; the Activity-owned input port is bound by a root adapter copying all
three arrays. No profile, credentials, role/status or raw relationship row
crosses this boundary. Preserve missing-profile behavior (empty interests, still
read relationship facts), no invented account-status/privacy filter, profile
read before parallel follow/block reads, non-retired edges and both block directions.
This internal reader is not authentication; the existing viewer GraphQL guard remains.

Activity application now orders its own visit-state, Users context and candidate
reads. Guests skip state/context entirely. Its repository reads only Activity
entries/state, filters active PUBLIC/MEMBERS candidates as before and selects
the most recent 500 before ranking. Ranking moves unchanged to a private Activity
application service; score weights/age rounding, reason precedence, timestamp/ID
ties, normalization, post-ranking pagination, total unread and explicit visit writes
are retained. No cache or new snapshot transaction; provider errors propagate.
See [D4.3d2 evidence](../audits/D4_3D2_ACTIVITY_VIEWER_CONTEXT.md).

### Remaining SQL ownership work (D4.3d3 onward)

#### D4.3d3 execution boundaries

Preserve the existing distinction between independent reads and transactional
pages. D4.3d3a first moves the separately queried public attachment metadata to
Media ownership, through a News-owned input port/root adapter. News application
owns document label extraction, contentGate exclusion, order/deduplication and
display kind; its full delivery projection composes the result without querying
Media from the News repository. Media selects only the already exposed fields,
active references and READY/PUBLIC/non-deleted files. No storage keys/paths,
credentials or generic Prisma object crosses the business boundary.

This is not full News delivery isolation: Users author projections and Interactions
joins/read pages remain. Subsequent D4.3d3 work must retain numbered-page and
rating/comment read transaction semantics, comment root/tree ordering and error
behavior. Do not split those transactions into unprotected calls merely to remove
imports. Record/preserve each owned query and provider projection before transfer.

New characterization finds DEBT-051 (canonical document wrapper skips attachments)
and Critical DEBT-052 (Full News returns gated document payload without invoking
Editor viewer redaction). Both are recorded in the debt register and reported to
the owner. On 2026-10-14 the owner approved both separate correction packages:
DEBT-052 first, then DEBT-051. See the
[security implementation plan](DEBT_052_FULL_NEWS_REDACTION_PLAN.md). D4.3d3a
does not silently repair them or treat passing characterization as acceptance.
DEBT-052 blocks release/Phase 11 readiness regardless of import-count progress.

Separate correction progress (base `5851381`): DEBT-052 now composes viewer-safe
JSON through Editor/News owned contracts without changing D4.3d3a metadata
ownership. Forty-five focused E2E pass, including explicit adjacent disclosure
characterizations. The owner subsequently approved DEBT-053 News search and
DEBT-054 related-summary audience corrections, in that order after DEBT-052;
DEBT-051 remains a separate functional package after the priority security work.
Full D4 ownership and D5–D7 are not replaced by these corrections. Full API E2E
executes 211 tests, with 210 passing and the existing DEBT-045 failure/open handles.

This is not full SQL ownership acceptance. Source inspection finds:

- News delivery ownership is now locally transferred in D4.3d3b to owned News,
  Users and Interactions technical readers plus the approved root snapshot unit.
  Full gates/review/CI/acceptance remain open; see its separate evidence above.
  Independent attachment metadata is already Media-owned and canonical manifests
  are corrected separately by DEBT-051. No full D4 SQL acceptance is claimed.
- Transactional mentions are now locally transferred to an Interactions-owned
  stateless writer and approved root SQL/transaction composition, with separate
  Users handle and Auth ACTIVE-ID selectors. All 16 golden and 13 runtime E2E pass;
  full acceptance remains open. No profile pre-read, business ORM callback or
  isolation/budget change is introduced. See the [design](D4_TRANSACTIONAL_MENTIONS_PLAN.md)
  and [runtime evidence](../audits/D4_MENTIONS_OWNED_TRANSACTION.md).
- Reputation history/original reads now locally use owned ledger/profile adapters
  and a semantic root read unit, preserving their Read Committed/independent-read
  distinction and statement order; see [read evidence](../audits/D4_REPUTATION_READ_OWNERSHIP.md).
  Write-response actor joins in createDirect/reverse are now locally transferred
  through a semantic root write unit and owned ledger/Users adapters, preserving
  default isolation, both actor-read stages and atomic audit/outbox semantics;
  see [write evidence](../audits/D4_REPUTATION_WRITE_OWNERSHIP.md). Full quality,
  CI and acceptance remain open. Users shared-row/profile/directory/update/viewer
  paths and role display are now locally transferred through the owner-approved
  guarded fragments/root composition, with safe records and no unused Auth
  commands in Users; see [runtime evidence](../audits/D4_USERS_OWNED_PROFILE_COMPOSITION.md).
  Five reviewed Prisma imports are removed (89 → 84); full quality/CI/acceptance
  remain open. Achievements and Custom Titles transaction-local recipient checks
  now use Users-owned ID-only reads through root units and owner writers; see
  [runtime evidence](../audits/D4_GAMIFICATION_RECIPIENT_TRANSACTIONS.md).
  IAM transaction-local checks have a [local Auth-owned runtime transfer](../audits/D4_IAM_SUBJECT_TRANSACTIONS.md)
  with inherited red gates and acceptance open; independent subject anchors now have
  a [local separate transfer](../audits/D4_IAM_INDEPENDENT_SUBJECT_READS.md).
  These are all-state existence checks, not ACTIVE
  eligibility; no blanket approval of remaining joins or full D4 closure.

The shared-row/role increment has a separate
[operation inventory and proposed owner-fragment design](D4_USERS_SHARED_ROW_BOUNDARY_PLAN.md).
Twenty pre-transfer migrated characterizations pass, including the installed
batch transaction defaults. Its subsequent runtime implementation is linked
above; characterization alone is not ownership transfer or full D4 acceptance.

Next subject/recipient increment: [complete operation plan](D4_SUBJECT_CHECK_BOUNDARY_PLAN.md)
and [pre-transfer evidence](../audits/D4_SUBJECT_CHECK_CHARACTERIZATION.md).
Nineteen real migrated tests pin four transaction-local checks plus two independent
IAM anchor/existence paths. ID-only existence accepts all existing states; it is
not ACTIVE eligibility. The [gamification runtime follow-up](../audits/D4_GAMIFICATION_RECIPIENT_TRANSACTIONS.md)
transfers awards/title grants; IAM transactional and independent anchor transfers
are locally verified with inherited red gates/acceptance open. The subsequent
[SQL/Worker inventory](D4_SQL_WORKER_INVENTORY.md) remains in progress; its first
pass is not an exhaustive ownership acceptance.
The owner subsequently approved prioritizing the discovered Core Authorization
assignment reads before Leaderboards. Its [separate runtime evidence](../audits/D4_AUTHORIZATION_READ_OWNERSHIP.md)
distinguishes local implementation/gates from complete SQL ownership acceptance.

The import inventory does not detect table ownership and must not waive these
items. This is a reviewed starting inventory, not exhaustive proof of all joins;
complete delegate/relation/raw-SQL/Worker projection review before D4.5 acceptance.

Owner-approved follow-up (2026-10-14): use a scoped root-infrastructure read UoW
and owner persistence adapters with Repeatable Read for composed News responses,
not global isolation changes or ORM business contracts. Six migrated foundation
characterizations pass, including deterministic isolation probes. Priority
DEBT-056 is implemented separately in draft PR #15. D4.3d3b runtime transfer now
passes its focused and deterministic coherence regressions; full gates remain
open. DEBT-057 tombstone transport is only recorded, not silently included.
See the foundation and implementation evidence for exact scope.
Preserve transaction and failure semantics when migrating each fact. Full D4.3,
D4.4/D4.5 and D5–D7 remain OPEN.

### D4.3c transfer contract (owner policy registration)

Interactions publishes registration/unregistration only, not its mutable concrete
registry or authorization router. Callback requests carry target/owner/viewer IDs
and capability, not target timestamps, persistence rows or content. Wrapper
identity is stable across duplicate registration and stale unregistration.

News and Users publish separate decision-only contracts for their own objects.
They do not import Interactions, own registry lifecycle or receive foreign target
records. Root composition binds the two fixed target kinds and translates only
the owner-required fields. Comment policy stays private to Interactions. Keep
missing owner, unpublished/disabled News flags, block/privacy decisions, target
lifecycle precedence and parent-comment authorization unchanged. Missing policies
and provider errors fail closed; startup registration failure cleans up partial
root bindings. No new ACL, moderation rights, SQL or transport schema is included.

### D4.3b transfer contract (atomic content targets)

Keep all target/content/reference/audit/outbox writes in the existing PostgreSQL
transaction. News and Users receive operation-specific semantic write ports,
never a Prisma client or generic callback/ambient-transaction framework. Their
ordinary reads and application policy remain owned. Explicit root infrastructure
units of work implement News draft create/save and Profile Wall create/tombstone.

The shared target writer is persistence, not an application service: relocate it
inside Interactions infrastructure and remove its business-root/Nest exports.
A named infrastructure-only entry publishes that stateless persistence adapter
solely to root infrastructure/assembly. Its transaction argument stays entirely
inside infrastructure, is not a public business contract, and is forbidden to
other feature consumers by an explicit architecture rule. This preserves the
single owned target/audit/event algorithm without copying it into multiple roots.
Interactions' own comment repository keeps using its owned private writer.

Preserve event names/categories/payloads, target ownership conflict/idempotency
behavior, News optimistic revisions and slug conflicts, Wall tombstone redaction
and reference retirement. Verify rollback on failures at target and content
audit/outbox stages with real PostgreSQL. Policy registration and remaining
News/Media/activity transfer are still subsequent D4.3 obligations.

### D4.3a transfer contract (bounded content increment)

Editor publishes only NEWS/COMMENT normalization operations, not preview, gate
creation or its concrete services. News and Interactions own separate input ports;
root adapters fix the expected profile and pass only their required projections.
Content Access publishes a decision-only reader (gate ID, allowed, bypassed, unmet,
notice), never the gate owner, requirements, thresholds or timestamps. Editor owns
its decision input shape; the root adapter translates the closed requirement kinds.
Keep canonical validation, profile mismatch errors, recursive redaction, duplicate
gate evaluation per request and propagation of provider failures unchanged.

No persistence, interaction target lifecycle, outbox, audience policy or API schema
changes belong to this increment. D4.3 still requires the remaining interaction,
News/Media and activity boundaries; this increment does not close full D4.3 or D4.

### D4.2 transfer contract

Reputation consumes separate account evidence (active flag and subject creation
time), profile existence and bidirectional block decisions. Auth owns minimal
account evidence; Users owns existence/blocks. No full UserRecord, credentials
or Prisma enum crosses those ports. Existing error ordering, rolling cooldown,
age threshold, public history and immutable reversal semantics are preserved.

The four avatar/cover GraphQL mutations move from Media presentation into root
presentation composition, consuming published Media commands and the existing
Users viewer projection. Names, arguments, Viewer schema, fallback avatar and
timestamp strings remain unchanged. Media candidate validation remains owned.

Current avatar/cover persistence directly writes Users profile fields together
with Media references/audit. Transfer that cross-owner transaction into a named
root infrastructure unit of work behind a Media-owned semantic transaction port.
Keep candidate recheck, reference retirement, profile update and audit in the
same transaction. No ORM client is passed through application/public contracts;
do not move a profile write to an asynchronous event or split the transaction.
No new tables, owner rights, moderation tools or visual design are introduced.

Pure tests cover missing recipients, provider failures, balance and current
calculation semantics. Real PostgreSQL verifies existence across statuses and the
minimal query projection; real AppModule tests exercise events, duplicate delivery,
reversal and level transitions through the root adapters. Module/AST tests pin
named exports and private providers. Run format, lint, typecheck, Prisma validation,
unit/integration, relevant E2E, production build, architecture/license, generated
consistency and dependency audit; record inherited blockers without waiving them.

D5–D7 remain required. Stop before Phase 11 for its mandatory brainstorm.
