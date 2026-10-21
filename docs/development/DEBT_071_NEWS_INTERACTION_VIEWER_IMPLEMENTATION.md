# DEBT-071 — News interaction viewer eligibility

Date: 2026-10-21. Branch: `debt/debt071-news-interaction-eligibility`.
Base: `2f220ad` / draft PR #67; stacked review dependency, not an accepted baseline.
Status: locally implemented and bounded regressions verified; CI/review and release acceptance pending.

## Approved boundary and implementation

The owner approved the [design](DEBT_071_NEWS_INTERACTION_VIEWER_PLAN.md), including
the isolated legacy Wall guest bridge and current precheck/write transaction split.

- Interactions owns an explicit readonly guest/authenticated-subject union.
  Required context replaces the actor string through target/registry, registered
  callbacks and inherited comment READ. Existing authenticated consumers construct
  it from their trusted actor; guest engagement no longer invents a member-like ID.
- Registry rejects malformed tags/empty subjects before owner dispatch. Callback
  projection reconstructs only tag/subject, not additional object fields. Root
  rejects invalid context and sends News only its independent authentication-state
  value: no subject, credentials, profile, session, roles or visitor key.
- News keeps one owned findById read, canonical coordinate matching, PUBLISHED and
  non-null publishedAt, PUBLIC/authenticated MEMBERS eligibility and current
  capability flags. No Auth dependency, staff/Premium bypass, new ACL, Full News
  call or document-gate evaluation is introduced.
- Root alone maps Wall guests to the exact prior `anonymous` value. Users Wall
  policy/contract/SQL are unchanged. Real PUBLIC/PRIVATE Wall and inherited-comment
  parity covers guest/member/owner; prior private/block/lifecycle tests remain.
  This does not certify uncharacterized guest/MEMBERS Wall behavior.
- Engagement repository, hashing/account keys, guest-null actor, deduplication,
  channel counts, transaction/isolation/timeout and tables/migrations are unchanged.
  Denial or provider failure never invokes engagement persistence/counter reads.
  No linearizable guarantee is claimed for revocation racing an in-flight write.

All authored source imports/exports are named. Changed source Passports explain
the boundary; previously unheaded touched engagement/comment policy tests/services
receive Passports. Frontend, public GraphQL inputs/outputs, dependencies and schema
are not changed. One older owner-policy fixture now gives its synthetic PUBLISHED
article a publication time; the dedicated imported-null-date denial is retained.
News foundation edits only migrate its two typed target calls, not DEBT-045
expectations or cleanup. No test timeout or failing gate is weakened.

## Red-before and real regression evidence

Before any runtime edit, the converted eight migrated HTTP assertions produce
3 pass /5 fail, normal exit1, zero skipped. The failures are the three guest/
invalid/revoked MEMBERS paths, inherited comment view and null-publication-date
view. This pins the original defect rather than treating passing characterization
as safety. Fixtures use actual Auth sessions and the editorial submit/approve/
publish workflow, not mocked successful authorization.

The first expanded HTTP run passes68/68 across three suites, normal exit0,
29.198s: News security27, owner policy20 and secondary audience21. It covers
expired/disabled credentials, PUBLIC guest fallback, current members, comment
ancestry, all nonpublished states, visibility/session changes on later requests,
all seven share channels, deduplication and News owner exceptions. Query capture
proves one News read, one engagement INSERT and the existing three count/group
reads for accepted events; a protected denial has one News read and no engagement
INSERT/count/group query. Presence wrappers call real code and drain writes.

Four further lifecycle/unbound/missing/mismatched-owner cases are added for final
verification. Scoped unit tests initially pass98/98 across11 suites. Initial
typechecks found old root-test actor request fields and an extra-field test cast;
these are corrected to the required viewer request and a structural test variable,
not suppressed or treated as inherited production failures.

The next focused run reports52/72: News31 and secondary21 pass, but all20 owner
tests fail at shared beforeAll because Nest cannot open schema.gql for generation
(Windows UNKNOWN file access), not an owner assertion. A concurrent SDL hash probe
was also performed during this run; causality is not proven. Preserve that failed
report and rerun sequentially without touching SDL, rather than changing timeout,
policy or generator code. The first architecture gate also correctly detects the
new approved NewsInteractionViewer public type; its exact named-export allowlist
is updated by one entry. Final architecture140/140 and zero baseline additions
pass; the rule and frozen diagnostic baseline are not broadened/regenerated.

Sequential retry passes72/72 across three suites, zero skipped, normal exit0,30.107s:
News security31, owner policy20, secondary audience21. No code changes, schema
probe, generator or timeout change separates the failed-startup run and this
retry. The failed run remains recorded, not counted as successful coverage.

## Final gates

API coverage1206/1206 across160 suites, zero skipped, all four DB/Redis flags,
normal exit0,70.857s. Workspace lint9/9 and types9/9 pass (eight cached tasks
each); Prisma validation/generation pass. Build6/6 (five cached),28.059s passes.
Architecture/license140/140 and zero inventory additions pass after the explicit
type allowlist update. Editor23, Storage43, Worker46, Web59 and patch14 pass.

Global format41, dependency audit1 high/11 moderate and GraphQL DEBT-044 remain
red. The consistency run generated only the inherited eslint-disable barrel diff;
that side effect was restored without accepting it or modifying generated source.
Full freshly migrated E2E:546/547 across50 suites, zero skipped,483.212s.
News security31/31, owner policy20/20, secondary21/21 and App27/27 pass. The only
failure is inherited DEBT-045 viewCount null/zero and target-retirement cleanup.
An App pass is observed, not a fix or acceptance of the DEBT-048 timing debt.
After complete JSON and zero other DB clients/isolated fixture schemas, only
the matching completed Jest PID18116 was stopped for retained handles; wrapper
reports E2E_FULL_EXIT=1 after cleanup, not a normal green exit. Only disposable
tmpfs DB5435 was recreated and migrated; dev5433 is not reset.

After the run, generated source has no diff and SDL SHA256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
The owner's untracked STACK_AUDIT_PLAN.md remains unchanged and excluded.
Scoped source Passport paths32, changed-file formatting/diff and75 local Markdown
links pass. This bounded path check is not the future full D5 Passport validator.
Publication/CI and independent review remain pending. This report does not close
full D4, D5–D7, the separate stack audit or Phase 11 brainstorm. Known red baseline
gates must be recorded and resolved; none is waived by this fix.
