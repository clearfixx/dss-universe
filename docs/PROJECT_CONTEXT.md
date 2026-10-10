# DSS Universe — Project Context

> Status: Living orientation snapshot, not release acceptance
>
> Updated: 2026-10-10 — pre-Phase-11 debt closure / D1

## Product and authority

DSS Universe is a modular developer community and learning platform:
Build. Share. Learn. Grow. Together.

News, Knowledge Forge, Research Lab, Community Hub, Academy and Downloads are
separate products. Shared Media, Editor, interactions, authorization, events
and gamification support them without owning their content lifecycles.
Mission Control is administration; Command Deck is the user's dashboard.

Read these sources before selecting work:

1. [Canonical 1.0 roadmap](roadmap/DSS_UNIVERSE_1.0_ROADMAP.md) — product phases.
2. [Pre-Phase-11 plan](development/PRE_PHASE_11_EXECUTION_PLAN.md) — current sequence.
3. [Debt register](development/DEBT_REGISTER.md) — unresolved findings.
4. [D1 scope decisions](development/D1_SCOPE_DECISIONS.md) — unresolved owner choices.
5. [Development workflow](development/workflow.md) — implementation and gates.

Legacy roadmaps are historical. This snapshot does not override source code,
approved ADRs or recorded owner decisions.

## Current position

Product implementation has progressed through Phase 10 and the Auth UX bridge.
Phase 11 has not started. Current work is debt closure, not a return to Phase 4.

| Area             | Current evidence-based status                                                  |
| ---------------- | ------------------------------------------------------------------------------ |
| Phases 1–4, 7, 9 | Historically delivered; full current acceptance must be reproduced             |
| Phase 5          | Partial: Auth/session features exist; access-group scope remains open          |
| Phase 6          | LOCAL Media implemented; MinIO/S3 operational adapters absent                  |
| Phase 8          | All packages implemented; formal owner/runtime acceptance pending              |
| Phase 10         | News packages implemented; shared Search and notification delivery not claimed |
| Auth UX bridge   | Verification, recovery, sessions, abuse controls, alerts and 2FA implemented   |
| D0               | Environment implementation on review branch; baseline acceptance remains red   |
| D0.5             | Dependency remediation and local braces mitigation; audit still has one high   |
| D0.6             | Portable storage checks; focused Windows/Linux CI passes; review pending       |
| D1               | Canonical documentation reconciliation active                                  |

Branches/PRs are stacked review artifacts, not accepted releases. D1 starts from
`debt/d0-6-storage-security`; no red PR is merged to establish a false baseline.

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
- Auth owns authentication, not public profiles; known violations await D2/D3.
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

Finish D1 decisions, then D2 contracts, D3 Auth boundaries, D4 module boundaries,
D5 Passports, D6 full quality and D7 owner/release gate. Only then brainstorm
Phase 11; implementation needs separate approval and a phase branch.

One package per branch/PR. Commit/push/PR authorized; do not merge red checks.
Preserve unrelated edits. Record out-of-scope defects and notify the owner.
Frontend design belongs to another workstream: no speculative UI/UX.
Recommend the next model in the current package's final report.
Product choices and accepted exceptions belong to the owner.
