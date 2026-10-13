# D4 — Cross-module boundary remediation

Date: 2026-10-13. Status: authorized debt-remediation execution, not Phase 11.
Branch: `debt/d4-module-boundaries`.
Implemented increments: D4.1 and D4.2; remaining inventory 118, full D4 OPEN.
See [D4.2 evidence](../audits/D4_2_REPUTATION_PROFILE_ASSETS.md).
Review stack base: `173358d` / draft PR #9. Parent acceptance is still pending;
no red PR is merged and this branch is not an accepted release baseline.
Authority: approved pre-Phase-11 D4 plan and ADR-003/004.

## Outcome and invariants

Close the full D4 inventory, not merely rename broad services into facades.
Current reviewed inventory: 135 findings. Every reduction needs exact source,
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
