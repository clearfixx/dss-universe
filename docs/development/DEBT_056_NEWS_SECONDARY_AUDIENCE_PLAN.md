# DEBT-056 — News secondary audience

Date: 2026-10-14. Status: implemented locally; full gates, review, CI and owner
acceptance remain open. No merge or Phase 11 readiness claim.

## Authority and boundaries

The owner approved a separate priority security correction before D4 News SQL
ownership transfer. Branch `debt/debt-056-news-secondary-audience` starts from the
separate D4 characterization/design commit `6cdfbd4`, itself based on DEBT-051
`ae144bc` / draft PR #14. All parent increments remain unaccepted.

Use existing News article eligibility, not new groups, moderation rights, Premium
semantics, hidden-content policy or Auth persistence. This package does not migrate
owner SQL, implement Repeatable Read or repair DEBT-057 tombstone transport.
The separately approved root read UoW remains the next D4 implementation.

## Correction

`PrismaNewsDeliveryRepository` reuses its current article predicate before either
secondary projection: PUBLISHED, non-null canonical publishedAt, and PUBLIC for
guests / PUBLIC or MEMBERS for authenticated viewers. Each operation additionally
checks its own allowComments/allowRating flag. Inaccessible, missing and disabled
articles retain the existing empty-page shape, including the requested page/size
and zero total/totalPages, before any comment or reaction query.

Ratings now receive the existing optional authenticated subject ID through the
GraphQL resolver, application service and News repository contract. No token or
User aggregate crosses that contract. GraphQL names, arguments, result models,
validation, default sizes, comment tree construction and vote ordering stay the
same. Article authors receive no unpublished-content bypass. Existing optional
JWT behavior remains unchanged: invalid/revoked credentials fall back to guest
audience. Eligibility read failures propagate, never produce an allow fallback.

This is the same eligibility as current Full News, not a new guarantee against
all concurrent policy changes. The separate D4 read-UoW contract will put composed
News persistence reads into the approved snapshot. No timeout increase, positive
grant cache or new global database isolation setting is introduced here.

## Regression evidence

Two original guest disclosure characterizations now assert denial and absence of
synthetic restricted text/voter identity. The valid tombstone error remains an
explicit DEBT-057 characterization, not desired behavior or a hidden fix.

`news-secondary-audience.e2e-spec.ts` adds 21 real migrated AppModule cases:
PUBLIC guest/member/author controls; MEMBERS guest denial and member/author allow;
all six non-PUBLISHED states; missing publication time; independent feature flags;
root/reply and vote pagination/order; current visibility changes; malformed JWT;
actual session revocation; missing/inaccessible query short-circuit; failed
eligibility storage. Presence spies await actual writes, not mock successful
authorization. No real private content is read.

The first red run exposed one test-fixture mistake: editing immutable comment
createdAt. That edit was removed; DB protection stays enabled. Reply creation uses
the actual fourth parent-ID argument. Corrected pre-production baseline:
**19 PASS / 8 FAIL**, 27 tests, zero skipped, normal failing exit (15.505 s).
All eight remaining failures are access/total/query-short-circuit regressions.

After the bounded production correction, the 21 new cases, six foundation cases
and 12 related-audience regressions pass: **39 PASS**, zero skipped, normal exit
(21.785 s). This is focused evidence, not a full quality certificate.

Ignored local evidence: `node_modules/.cache/dss-debt-056-*` command logs and Jest
JSON. Full gates and inherited blockers must be recorded before draft publication.
The owner-authored untracked stack audit plan is left untouched and unstaged.

## Current quality gates

Full API unit/integration coverage: **899 PASS**, 137 suites, zero skipped,
normal exit (49.828 s). All four Auth/recovery/IAM/Redis opt-ins and all nine
existing coverage thresholds are enforced. One new unit checks rating viewer
forwarding; no coverage threshold is weakened.

Root lint/typecheck, Prisma validation, production build and architecture/license
checks PASS. The build compiles API freshly and reuses five unchanged cached
outputs. All 52 architecture fixtures pass; frozen inventory stays at 89 known
findings, not full ownership acceptance. Canonical GraphQL schema blob matches
HEAD (`98bd7ebc8691b9751a3a783d2520de7d6bbc22ef`). No Prisma schema, dependency,
migration or authored frontend changes.

Global format remains red on 41 inherited files; dependency audit reports one
high and ten moderate findings. All 14 dependency-patch regressions pass.
These failures remain release blockers, not waivers or corrections in this scope.

For the full API E2E, the exact owned tmpfs PostgreSQL project on 5435 is verified
by Compose labels, loopback port and tmpfs mount, then recreated after confirming
zero active queries. Only synthetic fixtures are removed. Zero public tables
before migration; all 54 existing migrations applied, no seed. Dev 5433 and test
5434 are untouched.

Full API E2E completes **287 PASS / 2 FAIL**, 30/32 suites, 289 tests, zero
skipped (212.65 s). All 27 new/foundation cases and the existing related,
attachments, viewer redaction, search/performance and atomic-composition suites
pass in this full run. The two failing tests repeat DEBT-045: News foundation
expects viewCount null while implementation returns zero (its suite also retains
the prohibited target-deletion cleanup failure), and the Auth registration/viewer
case exceeds the unchanged five-second deadline. No assertion, trigger, timeout,
frontend or scoring rule is altered to green this run.

Jest retains open handles after writing its complete failing JSON. Read-only DB
inspection confirms zero owned fixture schemas and no active test DB queries;
only the exact owned Jest PID/command is then stopped. This is not a successful
full-suite process exit. The isolated entire Auth repeat is recorded separately
and cannot waive this full-run failure.

Isolated entire Auth repeat: **25 PASS / 1 FAIL**, 26 tests, zero skipped,
normal failing exit (28.642 s). The same registration/viewer case again exceeds
five seconds; no successful-repeat claim or complete cause is asserted.

GraphQL consistency remains red on DEBT-044's inherited generated barrel comment
drift (`/* eslint-disable */`), not on schema/operation changes. Its local generator
side effect is inspected and restored to the exact original blob before commit.

Fresh other workspace checks PASS: Editor 23, Storage 43, Worker 36 and Web 59;
coverage collected for Storage/Worker/Web. Storage's first invocation never ran
tests because this operator mistakenly supplied a second maxWorkers argument;
one corrected invocation uses the script's existing two-worker bound and passes.

Bounded browser verification runs only the existing guest entry smoke, not all
13 Web cases. Story: guest landing renders, then the visitor follows Enter
Station to authentication. The heading renders, but the expected Enter Station
link is absent from the actual DOM (DEBT-034), so this one test fails and the
flow stops there. Server starts successfully; no successful client-to-API/login
journey is claimed beyond that broken boundary. No UI/UX or test assertion is
changed. The previous parent PR #14 CI Web smoke also remains failed; that is
separate-head evidence, not a current Web pass.

Next dev and GraphQL generator side effects in Web AGENTS.md and gql/index.ts
are inspected and restored exactly; generated barrel hash matches original
`af783993600932bfe5466bd5413fc8b4c85c021c`. Canonical schema, authored frontend,
Prisma schema and lockfile remain unchanged. Final changed-file format/diff gates
pass. This is a draft correction with inherited blockers, not a complete green
package or accepted Phase 11 baseline. Independent review, current-head CI and
owner acceptance remain open.

## Next boundaries

After this priority correction, continue the approved D4 ownership/snapshot
implementation; then remaining D4 public boundaries and D5–D7, stack boundary
audit/acceptance, and the mandatory Phase 11 brainstorm. DEBT-057 requires a
separate decision about nullable tombstones and generated client compatibility.
