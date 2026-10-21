# D4.2 — Reputation evidence and profile-asset composition

Date: 2026-10-13. Status: IMPLEMENTED increment / full D4 acceptance OPEN.
Branch: `debt/d4-module-boundaries`; increment base `a9697c9`.
Review artifact: [draft PR #10](https://github.com/clearfixx/dss-universe/pull/10),
stacked on unaccepted PR #9. No red parent branch is merged.

## Transfer and preserved behavior

Reputation no longer reads full Users records or imports Prisma UserStatus.
It consumes three independently owned ports:

- Auth evidence: current active flag and account creation timestamp only;
- Users profile existence: boolean, including inactive profiles for history;
- Users bidirectional block decision: boolean, excluding soft-removed blocks.

Root adapters translate published owner contracts; storage failures propagate.
Auth has no profile or Reputation policy knowledge. Its age timestamp is the
existing subject-creation value in the physically shared User row, not a second
mutable account-age projection. No credentials, usernames or profile aggregate
are selected for reputation eligibility.

Existing error ordering, self-rating denial, mandatory reasons, minimum age,
rolling cooldown, public history, append-only reversal and Outbox behavior
remain unchanged. No scoring rule or privilege policy is introduced.

Media no longer imports Users services, its broad mapper or private Viewer model.
The four existing viewer avatar/cover mutations live in named root presentation
composition, using published Media commands and Users viewer presentation.
Authentication, self-targeting, mutation names/arguments, response fields, ISO
timestamps, fallback-avatar URL and public GraphQL schema remain unchanged.

The previous avatar/cover repositories wrote Users profile fields inside Media.
Their cross-owner write now lives in `PrismaProfileAssetTransaction`, an explicit
root infrastructure unit of work. Media keeps candidate/variant validation.
The unit of work retains the in-transaction owner/READY/PUBLIC recheck,
reference retirement/creation, profile update and atomic audit. Its closed
semantic port exposes IDs and a derived URL, never a Prisma transaction/client.
It is an infrastructure coordination input, not an alternative unvalidated HTTP API.

UsersService, UserBlockService, UsersRepository and UserPrivacyService are no
longer exported as Nest integration providers. Users root exports only named
contracts, module assembly and error constants. ReputationService is private.
Media's unrelated upload/repository exports remain D4.3/D4.4 work.

## Verification

| Check                                                 | Result                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Before-transfer characterization                      | 14 existing Reputation/avatar/cover tests pass                                                        |
| Full forced opt-in unit/integration                   | PASS: API 630, Web 59, Worker 36                                                                      |
| Relevant full AppModule E2E                           | PASS: 28 across Reputation/assets, gamification, groups, authorization and audit                      |
| D4.2 isolated E2E after added removal rollback checks | PASS: 8                                                                                               |
| Root coverage                                         | PASS: API 538 pass / 92 opt-in skipped; Web 59, Worker 36, Storage 43 pass                            |
| Root lint/typecheck                                   | PASS                                                                                                  |
| Production build                                      | PASS: API fresh; five unchanged package builds cached                                                 |
| Prisma validate / migration status                    | PASS; 53 current migrations, no new schema/migration changes                                          |
| Architecture/license/baseline                         | PASS: 36 fixtures; 128 → 118 findings, zero additions                                                 |
| Changed-file formatting / diff whitespace             | Checked before commit; global format still RED on the same 41 legacy files                            |
| Generated GraphQL consistency                         | RED: unchanged DEBT-044 barrel comment; API schema has no diff; owned generation side effect restored |
| Dependency audit                                      | RED: existing 1 high / 10 moderate, no dependency changes                                             |
| Security patch regressions                            | PASS: 14                                                                                              |
| Full API/Web E2E / final-head CI / review             | OPEN; inherited release blockers are not waived                                                       |

Coverage does not stand in for skipped DB tests: all 92 opt-in cases pass in the
separate full unit/integration run. Deliberately injected audit-failure logs are
expected test evidence, not unexplained runtime failures.

## Security and compatibility evidence

The eight real AppModule tests use all actual migrations in a uniquely owned
PostgreSQL schema. They prove atomic concurrent reputation cooldown, current
actor/recipient disable states, minimum age, both block directions, history for
existing inactive profiles, all four asset mutation responses, foreign/invalid
Media denial, current candidate recheck and unknown-slot rejection.

For both avatar and cover, failed assignment and failed removal audits leave the
original profile and active reference intact, without replacement records or a
second assignment audit. Successful removal retires the reference and preserves
the existing fallback/null response. No binary upload or external provider is
mocked into being operational; DB Media/variant fixtures exercise this owned flow.

Minimal projection tests assert exact `status, createdAt` selection and no secret
return. Composition tests verify command-before-profile sequencing, denied-command
short-circuit and missing/mismatched profile rejection. AST/Nest metadata tests
pin named exports and private implementation providers.

The full-schema fixture is generalized from D4.1 to
`test/helpers/migrated-api-schema.fixture.ts`. It is still test-only, loopback
dss*test-only and rejects public-qualified DDL. It drops only its UUID-owned
schema, never disables immutable-history triggers; a DB query confirms zero
`api_boundary*\*` schemas remain. Dev/production DB and frontend are untouched.

## Reviewed inventory reduction and remaining scope

Exactly ten prior findings are removed: three concrete service exports, three
foreign concrete-service findings, three foreign-private imports, and one
non-infrastructure Prisma import. No new baseline entry or exemption is added.
The root transaction transfer closes an additional ownership concern not counted
by that bounded syntactic inventory; the count alone is not compliance proof.

Full D4 still requires content/editor/interaction/News/activity contract transfer,
remaining wildcard/namespace exports, ORM isolation, cycle review and final
enforcement/acceptance. D5–D7 and the mandatory Phase 11 brainstorm remain required.
