# D4 — Cross-module boundary remediation

Date: 2026-10-14. Status: authorized debt-remediation execution, not Phase 11.
Branch: `debt/d4-module-boundaries`.
Implemented increments: D4.1, D4.2 and bounded D4.3a/b/c/d1/d2; remaining import inventory 89,
full D4 and the rest of D4.3 OPEN. See
[D4.3d2 evidence](../audits/D4_3D2_ACTIVITY_VIEWER_CONTEXT.md),
[D4.3d1 evidence](../audits/D4_3D_GATE_WALL_OWNER_EVIDENCE.md) and
[D4.3c evidence](../audits/D4_3C_POLICY_MEDIA_ACTIVITY_CONTRACTS.md).
Review stack base: `173358d` / draft PR #9. Parent acceptance is still pending;
no red PR is merged and this branch is not an accepted release baseline.
Authority: approved pre-Phase-11 D4 plan and ADR-003/004.

## Outcome and invariants

Close the full D4 inventory, not merely rename broad services into facades.
Starting inventory: 135 findings; latest reviewed inventory: 89. Every reduction needs exact source,
behavioral and contract evidence; no automatic baseline growth or waiver.
Keep NestJS, Prisma, PostgreSQL, Outbox/BullMQ and existing transport responses.
Do not invent frontend design, new scoring formulas, owner policy or Phase 11 flows.

## Implementation sequence

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

This is not full SQL ownership acceptance. Source inspection finds:

- News `prisma-news-delivery.repository.ts` joins Users author presentation and
  Interactions reaction/bookmark/comment/view facts; direct share/reaction/comment
  queries and Media reference/full-record joins remain. Split published read
  contracts/root presentation composition while preserving query ordering,
  pagination, audience/redaction and binary access policy.
- Interactions `prisma-comments.repository.ts:syncMentions` resolves ACTIVE Users
  handles inside the comment/revision/mention/audit/outbox transaction. Preserve
  transaction-local resolution and all-or-nothing evidence; do not replace it
  with a race-prone pre-read or a shared ambient transaction in business ports.
- Reputation history still joins Users display fields. Users repository still
  reads IAM role assignments and whole transitional shared rows. Achievements,
  Custom Titles and IAM perform transaction-local subject existence/eligibility
  checks. These require explicit ownership disposition in D4.3/D4.4, not blanket
  approval as harmless joins.

The import inventory does not detect table ownership and must not waive these
items. This is a reviewed starting inventory, not exhaustive proof of all joins;
complete delegate/relation/raw-SQL/Worker projection review before D4.5 acceptance.
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
