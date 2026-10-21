# D1 — Canonical Documentation Reconciliation

Date: 2026-10-10. Branch: `debt/d1-canonical-documentation`.
Base: `debt/d0-6-storage-security` (stacked review, not merged acceptance).
Status: documentation implemented; owner review and full baseline remain pending.

## Outcomes

- Current Position and Project Context now describe debt closure after Phase 10,
  not Phase 4/5 implementation. Phase 11 remains unstarted.
- Legacy phases/milestones are visibly historical; one canonical numbering remains.
- Owner decisions DEC-D1-01/02/03 preserve generic groups/Premium with IAM and
  Authorization ownership; LOCAL operational scope and News-local search are
  explicit, with MinIO/S3/shared Search deferred and not Phase 11 prerequisites.
- Phase 5 remains partial. Phase 6 LOCAL implementation is distinct from provider
  parity. Phase 8/10 audits map requirements to code/tests without granting runtime
  acceptance. Phase 9's Forum phase reference is corrected to Phase 13.
- Passport v3.1 rendering, template fences and headings repaired without changing
  template intent. Generated/config/schema inclusion remains a D5 decision.
- Workflow documents distinguish root quality subset from actual CI checks;
  missing orchestration remains DEBT-015/D6. Older role/flat-layout guidance is
  explicitly historical, not a source for new code.
- Explicit named public API and owned persistence rules are clarified; no runtime
  architecture refactor is hidden in this documentation package.

## Verification

- All 21 changed Markdown files pass Prettier; 43 local-link existence checks pass.
  Canonical Markdown fence checks pass. Two explicitly historical drafts
  (`architecture/backend.md`, `standards/backend.md`) retain legacy fencing;
  they are excluded from canonical fence acceptance, not claimed repaired.
- Changed documentation is Prettier-formatted; repository format still has
  43 pre-existing failures (50 before D1; seven touched legacy documents repaired).
- API unit: 308 pass / 3 skipped; Worker: 36 pass; storage: 43 pass.
- Web unit: 59 pass; Editor: 9 pass.
- Lint: 9/9 tasks, 7 cached. Typecheck: 9/9, 7 cached.
- Build: 6/6 tasks, 4 cached including unchanged Web. API/Worker builds rerun.
- Prisma validation and architecture/license checks pass.
- Source/schema/dependency/CI files unchanged by D1. No migrations/seed, new full
  E2E, fresh Web build or green release acceptance is claimed.

## Remaining owner/runtime gates

Historical quality exceptions were **not** accepted. D6/D7 must reproduce full
coverage/API E2E/GraphQL/browser/security acceptance. Open architecture debts
remain D2–D5 work; fixing documentation does not fix runtime coupling.

D2 must explicitly schedule an IAM-owned access-group implementation package
if existing D3/D4 scope is insufficient; a missing Guardian membership capability
cannot be silently implemented inside Knowledge Forge. Phase 11 entry still
requires approved ownership readiness and brainstorm, even though Search/storage
parity are no longer entry prerequisites.
