# DSS Universe — Project Context

> Status: Living orientation snapshot, not release acceptance
>
> Updated: 2026-10-14 — DEBT-053 approved batch optimization; acceptance still open

## Product and authority

DSS Universe is a modular developer community and learning platform:
Build. Share. Learn. Grow. Together.

News, Knowledge Forge, Research Lab, Community Hub, Academy and Downloads are
separate products. Shared Media, Editor, interactions, authorization, events
and gamification support them without owning their content lifecycles.
Mission Control is the user's dashboard; Command Deck is administration.
The [owner's product vision](development/PRODUCT_VISION_1_0.md) corrects historical
naming and records 1.0 scope; roadmap/module naming reconciliation remains open.

Read these sources before selecting work:

1. [Canonical 1.0 roadmap](roadmap/DSS_UNIVERSE_1.0_ROADMAP.md) — product phases.
2. [Pre-Phase-11 plan](development/PRE_PHASE_11_EXECUTION_PLAN.md) — current sequence.
3. [Debt register](development/DEBT_REGISTER.md) — unresolved findings.
4. [D1 scope decisions](development/D1_SCOPE_DECISIONS.md) — unresolved owner choices.
5. [Development workflow](development/workflow.md) — implementation and gates.

Legacy roadmaps are historical. This snapshot does not override source code,
approved ADRs or recorded owner decisions.

## Current position

At the package base, Critical DEBT-052: a real guest Full News response contains denied Content Gate
payload in documentJson because the published response path omits server-side
Editor redaction. DEBT-051 also confirms canonical document wrappers skip the
attachment manifest despite stored files/references. Both were reproduced with
synthetic data, documented and reported. On 2026-10-14 the owner approved separate
corrections: DEBT-052 first, then DEBT-051. See the
[security implementation plan](development/DEBT_052_FULL_NEWS_REDACTION_PLAN.md).
Passing characterization does not resolve them. DEBT-052 blocks release/Phase 11
readiness. See [debt register](development/DEBT_REGISTER.md).

On the separate `debt/debt-052-full-news-redaction` parent branch, the correction
now composes safe JSON through named Editor/News contracts. Twenty new migrated
E2E cases pass, including explicit DEBT-053/054 disclosure characterizations.
Full opt-in API units: 800 PASS; focused E2E: 45 PASS; coverage/build/lint/types
pass. Full API E2E: 210 PASS / 1 FAIL (known DEBT-045); Web smoke: 10 PASS / 3 FAIL
(DEBT-034). Format/audit/generated baseline and CI/review remain unaccepted.
See [corrective evidence](audits/DEBT_052_FULL_NEWS_REDACTION.md).
On 2026-10-14 the owner approved separate DEBT-053 search and DEBT-054 related
audience corrections, in that order after DEBT-052; neither is implemented here.
DEBT-051 follows the priority security work. No Phase 11 readiness is claimed.

The active branch is now `debt/debt-053-news-viewer-search`, based on published
DEBT-052 `0ecdbb1` / draft PR #11. The owner approved a public-only search index
plus live, batched authenticated gated-document projection with performance
tests and no hidden result limit. Shared Editor projection/contracts are the
first increment: full opt-in API units 819 PASS, nine new migrated root-boundary
E2E PASS, lint/types/build PASS; architecture inventory remains 89 known findings.
Global formatting remains RED on 41 legacy files. At the foundation/storage
checkpoint the shared branch's `3fb28c4` was another task's preserved localization
document commit, not a DEBT-053 implementation commit. Runtime work is now prepared
for draft publication; full workflow and performance acceptance remain open. See the
[DEBT-053 plan](development/DEBT_053_NEWS_VIEWER_SEARCH_PLAN.md).

DEBT-053 is published at `1406b90` in draft PR #12, stacked on PR #11. The owner
subsequently approved private ContentAccess evidence reuse per batch of at most
64 documents, explicitly closed after Editor projection, without cross-request
caching. The follow-up passes 890 opt-in API units/coverage, production build,
lint/types/Prisma and 52 architecture fixtures (inventory unchanged at 89).
Five isolated performance E2E pass with 1,000 distinct documents/600 distinct
gates: facts/audience reads fall from 600 to 10 per request; local member p95
is 1.022 seconds versus the strengthened 3.079-second baseline. Concurrent
member/author searches and second-batch outage/recovery pass without changing
timeouts, result limits or API. This does not establish production capacity.
Final full API E2E on a fresh migrated target: 244 PASS/2 FAIL (News foundation
and leaderboard, DEBT-045); all 72 directly relevant E2E PASS. Global format
still fails on 41 legacy files, audit on one high/ten moderate. Full-suite and
baseline-gate acceptance remain open; DEBT-054 then DEBT-051 are
still separate approved packages. No Phase 11 work or stack replacement.

The local storage increment now adds the 54th forward migration, versioned public
search evidence in atomic draft writes, source-change invalidation and source-
locked canonical backfill. Fifty-six focused migrated E2E pass. CLI readiness and
backfill verified the one existing synthetic disposable News row without changing
its authored fingerprint. The local runtime increment now computes viewer-safe
matches before pins/totals/pages within a repeatable-read snapshot. Eleven live
query E2E plus twenty Full News E2E pass. Isolated performance with 1,000 articles
(600 gated) passes and finds all matches beyond 500; the pre-optimization member
p95 was 3.657 seconds.
Concurrent DB gates exceeded the unchanged five-second transaction budget, and
broader full-suite verification is red/pending disposition. No accepted capacity,
release completion or Phase 11 readiness is claimed; no query fallback/result cap.

D4.3d3a moves the independent public attachment metadata query to Media ownership
and composes labels/order/display kinds in News application through narrow root
contracts. Existing behavior is retained, including the two newly recorded defects;
Users/Interactions projections and transactional pages are not yet transferred.
Full opt-in units: API 794 / Web 59 / Worker 36; 153 relevant E2E pass (25 new),
including explicit defect characterizations. Coverage/build pass; import inventory
stays 89, not full SQL ownership acceptance. Full D4/gates/review and DEBT-052 remain OPEN.
See [evidence](audits/D4_3D3A_NEWS_ATTACHMENT_METADATA.md).

D4.3d3a is committed/pushed as `5851381`, draft PR #10. Its initial publication
attempt failed before execution on an approval-review usage limit; a subsequent
account check and the same escalated approval route succeeded without a bypass.
The separate DEBT-052 branch is based on that exact head. No merge/CI-green claim.

D4.3d2 removes Activity's direct Users reads. Users publishes only interests,
following IDs and blocked IDs; root composition binds the Activity-owned input.
Activity application owns unchanged ranking; persistence reads only Activity
entries/state. Six algorithm AST comparisons match. Full opt-in units: API 755 /
Web 59 / Worker 36; 128 relevant E2E pass (17 new); coverage and production build pass.
Import inventory stays 89, not a full SQL ownership certificate. Full gate/CI/review
acceptance is OPEN; News delivery,
atomic mentions and shared-row/role joins remain D4.3/D4.4 work. No frontend,
schema, migration or Command Deck change. See
[evidence](audits/D4_3D2_ACTIVITY_VIEWER_CONTEXT.md).

D4.3d1 transfers gate statistics and Wall image checks to minimal owner evidence:
Auth retains account facts, Interactions counts comments, Reputation sums its ledger,
Media decides image eligibility. Content Access retains age/threshold policy and
Users retains privacy/block checks. Full opt-in units: API 716 / Web 59 / Worker 36;
111 relevant E2E pass (24 new); coverage and production build pass. Import inventory
remains 89, not proof of SQL isolation. Activity,
News delivery, transactional mentions and profile/role joins remain scheduled in
D4.3/D4.4. No frontend, schema, migration or Command Deck change. Full gate/CI/review
acceptance remains OPEN; see [evidence](audits/D4_3D_GATE_WALL_OWNER_EVIDENCE.md).

D4.3c removes concrete registry coupling from News/Users: root composition binds
minimal owner-decision contracts while Interactions keeps its registry private.
News consumes only Media owner/public/readiness facts; Users consumes only actor
activity summaries after its own privacy/block checks. No API, migration, frontend
or permission changes. Inventory: 89 (ten further removals, zero additions).
Full units: API 685 / Web 59 / Worker 36; relevant E2E: 84. Remaining direct
cross-owner SQL (including Content Gates facts) is explicit D4.3d work, not covered
by the import inventory; full D4 and release acceptance remain OPEN. See
[evidence](audits/D4_3C_POLICY_MEDIA_ACTIVITY_CONTRACTS.md).

D4.3b composes atomic News draft and Profile Wall writes behind semantic owned
ports; the shared Interactions writer is owned infrastructure with a guarded
technical entry, not a business export. Target/content/reference/audit/outbox
atomicity, optimistic revisions, event shapes and tombstone redaction are retained.
Inventory: 99 (four further removals, zero additions). Full scoped units: API 644 /
Web 59 / Worker 36; relevant E2E: 54. Local verification uses bounded sequential
workers after parallel runs hit OOM. CI at the preceding head stopped on an
unhandled Web scheduler error (DEBT-050), not API E2E. No frontend fix or acceptance
waiver. See [evidence](audits/D4_3B_ATOMIC_CONTENT_TARGETS.md).

D4.3a isolates Editor normalization and Content Access decisions with published
narrow provider contracts and separate consumer-owned ports/root adapters.
Editor no longer receives a gate aggregate; News/comments no longer inject an
Editor service. API/DB schema, policy and frontend are unchanged. Inventory:
103 (15 reviewed removals, zero additions). Full opt-in units: API 639 / Web 59 /
Worker 36; relevant E2E: 37; coverage/lint/types/build pass. Full D4.3/D4 and
release acceptance remain open. See [evidence](audits/D4_3A_CONTENT_CONTRACTS.md).

D4.2 separates Reputation account/block/existence evidence and moves profile-asset
GraphQL composition plus atomic cross-owner writes out of Media. Broad Users and
Reputation providers are private; no scoring, schema or frontend changes.
Inventory: 118 findings (ten further reviewed removals, zero additions).
Full opt-in units: API 630 / Web 59 / Worker 36; relevant E2E: 28; coverage,
lint/typecheck/build pass. Full D4/release acceptance remains open.
See [D4.2 evidence](audits/D4_2_REPUTATION_PROFILE_ASSETS.md).

D4.1 removes broad Users/Points dependencies from Community Points, Levels and
Achievements through minimal consumer-owned ports and root adapters. Behavior
is preserved; no new scoring rules or frontend design. Architecture inventory
reached 128 in that increment (seven reviewed removals, zero additions). Full opt-in units: API 609 /
Web 59 / Worker 36; relevant E2E: 20; lint/typecheck/build pass. Full D4 remains
open. See [evidence](audits/D4_1_GAMIFICATION_BOUNDARIES.md) and the
[remaining sequence](development/D4_MODULE_BOUNDARY_PLAN.md).

Full D3.5 is owner-approved and implemented on `debt/d3-5-iam-access-groups`,
stacked on `04a9d50` / draft PR #8: isolated membership validity/revocation,
non-staff Premium, explicit Knowledge Forge Guardian, atomic audit, current
Authorization decisions and safe profile group metadata. No Phase 11 workflow
or new owner/Command Deck authority is added. Full units: API 604 / Web 59 /
Worker 36; relevant HTTP E2E: 16; lint/typecheck/build and architecture pass.
Acceptance remains open: legacy formatting, dependency audit, broad E2E/generated
output debts and migration/schema drift (DEBT-049). See
[D3.5 evidence](audits/D3_5_ACCESS_GROUPS_IMPLEMENTATION.md).

Approved Premium gate increment is on `debt/d3-5-premium-gate-contract`, stacked
on D3 at `5896013`: mandatory GROUP audience before numeric threshold bypass.
That earlier increment alone did not complete generic groups or Guardian;
the wider D3.5 above supplies their foundation. Category ACLs and owner policies
remain separately scheduled. See [earlier evidence](audits/D3_5_PREMIUM_GATE_CONTRACT.md).

Registration atomicity verification: eight new isolated PostgreSQL tests and
four focused existing E2E pass; no production defect found. Full units now pass
535 API / 59 Web / 36 Worker. A broad GraphQL E2E times out twice (DEBT-048), so
full E2E acceptance remains red. See [evidence](audits/D3_REGISTRATION_POSTGRES_ATOMICITY.md).

Administrator-availability acceptance review records DEBT-047: assignment counts
do not prove eligible recovery-capable administration. Self-deactivation and
critical permission mutation need a separately agreed cross-owner policy. No
runtime correction is included. See [review](audits/D3_4_ADMINISTRATOR_AVAILABILITY_REVIEW.md).

DEBT-046's approved correction now protects the last `admin`/`super_admin`
assignment during IAM revocation using a role-locked transaction and existing
application safety policy. Deterministic DB concurrency and HTTP tests pass;
review and broader usable-administrator lifecycle acceptance remain open.
See [review](audits/D3_4_LAST_ADMIN_REVOCATION_REVIEW.md).

D3.4 now refreshes current request roles/permissions after session validation;
same-token REST/GraphQL revocation and fail-closed authority errors are covered.
DEBT-043 is implemented pending review. IAM role persistence is now isolated;
subject assignment persistence is also isolated, preserving protected revocation.
Reviewed architecture inventory is 135, all allocated to D4; the final D3 bcrypt
namespace import is replaced by named functions with real-library regressions.
See [evidence](audits/D3_4_EXPLICIT_BCRYPT_IMPORTS.md). IAM now also exposes narrow
membership/display contracts, never concrete Nest service/repository exports. Auth assembly uses
its named public root. D3 acceptance remains open.
See [public contract evidence](audits/D3_4_PUBLIC_INTEGRATION_CONTRACTS.md).
See [assignment evidence](audits/D3_4_IAM_SUBJECT_ASSIGNMENT_PERSISTENCE.md).
See [role boundary evidence](audits/D3_4_IAM_ROLE_PERSISTENCE.md).
Full API E2E is not green: fixture contamination and News cleanup/assertion drift
are DEBT-045. See [access evidence](audits/D3_4_AUTHORITATIVE_REQUEST_ACCESS.md).

Product implementation has progressed through Phase 10 and the Auth UX bridge.
Phase 11 has not started. Current work is debt closure, not a return to Phase 4.

| Area             | Current evidence-based status                                                  |
| ---------------- | ------------------------------------------------------------------------------ |
| Phases 1–4, 7, 9 | Historically delivered; full current acceptance must be reproduced             |
| Phase 5          | Access-group/Premium/Guardian foundation implemented; formal acceptance open   |
| Phase 6          | LOCAL Media implemented; MinIO/S3 operational adapters absent                  |
| Phase 8          | All packages implemented; formal owner/runtime acceptance pending              |
| Phase 10         | News packages implemented; shared Search and notification delivery not claimed |
| Auth UX bridge   | Verification, recovery, sessions, abuse controls, alerts and 2FA implemented   |
| D0               | Environment implementation on review branch; baseline acceptance remains red   |
| D0.5             | Dependency remediation and local braces mitigation; audit still has one high   |
| D0.6             | Portable storage checks; focused Windows/Linux CI passes; review pending       |
| D1               | Canonical documentation implemented; owner PR review pending                   |
| D2               | Contracts and report-only inventory implemented; verification/review pending   |
| D3               | Auth profile/registration separation transferred; D3.3/D3.4 acceptance open    |

Branches/PRs are stacked review artifacts, not accepted releases. D3 starts from
`debt/d2-architecture-contracts`; no red PR is merged to establish a false baseline.
The [D3 package plan](development/D3_AUTH_BOUNDARY_PLAN.md) stages the Auth boundary
refactor. D3.1 addresses access-session validation only; D3 remains incomplete.
The initial D3.2 safe-profile allowlist and field/operation inventory are recorded
in [D3 progress](audits/D3_PROFILE_BOUNDARY_PROGRESS_2026-10-11.md). Registration
and profile-response composition have since migrated; no full Auth isolation is claimed.
Credential reads/writes are now Auth-owned. Legacy access-token display/access
claims are assembled in [identity composition](audits/D3_TOKEN_CLAIMS_COMPOSITION_2026-10-11.md),
not supplied as profile data by Auth. Registration failure boundaries are
characterized against the real disposable database before ownership transfer.
The owner approved the Auth/subject/profile direction in
[ADR-003](architecture/adr/003-subject-and-access-ownership.md). D3.5 groups/Premium
was separately approved and implemented, not silently included in D3/Phase 11.

The separately approved [D3.4 factor lifecycle correction](audits/D3_4_TWO_FACTOR_ATOMIC_LIFECYCLE.md)
implements subject locking and atomic disable proof/mutation, including recovery
rollback. Broader D3.3/D3.4 acceptance and full release gates remain open.

Auth auxiliary Redis/queue capabilities are isolated. IAM permission persistence
now uses an owned adapter with atomic audit; roles/access remediation remains.
DEBT-043 records stale JWT-derived permissions after assignment revocation, which
must be resolved before authoritative access acceptance. Current review evidence
is summarized in [D3 review](audits/D3_REVIEW_SUMMARY.md).

## Repository map

```text
apps/api/          NestJS modular monolith, Prisma migrations, Jest/API E2E
apps/web/          Next.js App Router, GraphQL operations, verification UI
apps/worker/       BullMQ consumers, Media/ClamAV, email and projections
packages/editor/   shared structured-document engine
packages/jobs/     versioned job/event contracts
packages/storage/  portable storage-key infrastructure
packages/eslint-config/, packages/tsconfig/ shared tooling
packages/types/, packages/ui/ inspect before assuming runtime capabilities
scripts/           bootstrap, architecture and dependency-patch checks
patches/           reviewed local upstream dependency mitigation
docs/              roadmap, architecture, audit and execution evidence
standards/         engineering standards
```

API feature areas include Auth, IAM, Users, Media, Reputation, Community Points,
Levels, Custom Titles, Achievements, Leaderboards, shared interactions, Content
Access, Activity and News. Directory presence alone is not proof of completion.

## Runtime and local services

- Node **24.18.0**, pnpm **11.9.0**, pinned in repository configuration.
- NestJS 11, Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL 17.
- GraphQL/Apollo for product operations; REST for binary/operational endpoints.
- Redis/BullMQ with transactional Outbox; Pino/OpenTelemetry foundations.
- Tailwind, shadcn/Radix, Lucide, TanStack, Zustand, React Hook Form/Zod.
- Tiptap/ProseMirror document engine; Sharp processing; ClamAV scanning.
- Development: API 3001, Web 3000, PostgreSQL 5433, Redis 6379,
  Mailpit SMTP 1025/UI 8025, ClamAV 3310; optional OTLP profile.
- Disposable tests: PostgreSQL 5434, Redis 6380. CI uses a different DB port;
  read the workflow, never reuse production credentials/data.
- LOCAL is operational storage. MinIO/S3 identities are not working adapters.
  SMTP catcher is not a full email platform.

Use environment examples and bootstrap; never expose real secrets.
Check service health before runtime acceptance. Before Web source changes,
read `apps/web/AGENTS.md` and installed Next.js documentation.

## Architectural invariants and approved product direction

- Preserve existing conventions and ownership; DTOs remain DTOs.
- No foreign infrastructure imports or broad service coupling. Use explicit
  capabilities, contracts, projections or versioned events.
- Auth owns authentication, not public profiles; root composition assembles profiles.
- Prisma stays behind owned adapters; known leaks are debt, not precedent.
- Explicit named imports/exports; no wildcard barrel exports in new work.
- Domain models are not transport/Prisma representations; resolvers stay thin.
- Never expose hashes, tokens, protected document bodies or storage credentials.
- Media owns binaries; products own content/publication policy.
- Titles/achievements do not grant authority; points and reputation are distinct.
- System roles are USER, MODERATOR, ADMIN, OWNER. Custom groups/Premium remain
  approved product intent, not implemented behavior; see D1 owner decisions.
- Tiptap JSON is canonical; HTML/plain text are derived. Content Gates must redact
  denied content server-side. Premium/sanction precedence is not silently assumed.
- Normal content deletion preserves tombstones; security/legal/retention purges
  follow their owned lifecycle, not blanket soft deletion.
- New/materially changed authored source follows
  [File Passport](architecture/file-passport.md).

These are target invariants, not a claim that the repository enforces them all.
D2–D5 close audited exceptions. Planned moderation, themes, AI, Academy and other
later products remain governed by the roadmap, not invented here.

## Quality evidence, not promises

At D0.6 code commit `c0a5137`: API unit 308 passed / 3 skipped; Worker 36 passed;
storage 43 passed. Lint, types, Prisma validation, build and architecture checks
passed locally. Focused CI run `38077108683` passed on Windows and Ubuntu.
The unchanged Web build was a cache hit, not a fresh rebuild claim.

The full baseline is **not green**: 43 remaining format failures after D1 (50 at D0.6); dependency audit
retains 1 high / 10 moderate (braces patch is mitigation, not an audit exception);
Web smoke drift and API E2E acceptance remain unresolved.
See [D0.6 evidence](audits/D0_6_STORAGE_SECURITY_2026-10-10.md) and debt register.
Never promote unit-only or focused CI to full E2E/release acceptance.

## Next work and autonomy

Finish the agreed D0–D7 preparation/debt closure, including remaining D4 module
boundaries, D5 Passports, D6 full quality and D7 owner/release acceptance.
On 2026-10-14 the owner added a separate post-preparation
[stack audit](audits/STACK_AUDIT_PLAN.md). Conduct it against the accepted baseline,
confirm its scope and obtain decisions/verification/final acceptance before the
Phase 11 brainstorm. The audit is scheduled, not started; technology replacement
or behavioral changes need specific approval. Phase 11 implementation still
needs a separately approved brainstorm and its own phase branch.

One package per branch/PR. Commit/push/PR authorized; do not merge red checks.
Preserve unrelated edits. Record out-of-scope defects and notify the owner.
Frontend design belongs to another workstream: no speculative UI/UX.
Recommend the next model in the current package's final report.
Product choices and accepted exceptions belong to the owner.
