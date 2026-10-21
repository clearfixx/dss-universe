# D4 — Registration-owned persistence

Date: 2026-10-19. Branch `debt/d4-identity-profile-operation-review`, based on
`6c792df` (draft PR #56, unaccepted).

## Approved boundary

Owner approved Auth/Users-owned enrollment fragments and an IAM-owned baseline
role writer. This corrects residual persistence ownership, not a demonstrated
credential disclosure or a broken registration transaction.

- Auth selects only `email` and `passwordHash`; existing subject anchor selects ID.
- Users copies only `username` and optional `displayName` at profile binding time.
- IAM resolves the existing `user` role and inserts its assignment.
- Root retains the single shared-row INSERT and transaction lifetime.
- Technical exports remain named and guarded; business entries gain no ORM API.

Order remains role lookup → subject INSERT → assignment INSERT. Missing baseline,
duplicate keys and insert errors propagate unchanged. There are no schema,
migration, isolation, timeout, API, role-policy or Audit/Outbox changes. Sessions
and verification delivery remain post-commit; this does not make them atomic
with enrollment.

## Local verification

Before transfer, characterization passed six unit and eight PostgreSQL cases.
After transfer the same fourteen passed with `RUN_AUTH_DB_TESTS=1`, including
rollback, concurrent duplicate email/username and no downstream issuance after
failed enrollment. Synthetic database errors in those tests are intentional.
The first run without the opt-in flag passed six and skipped eight; it is not
the database verification result.

An additional unit case pins disjoint, detached Auth/Users fragments, ignored
extra runtime fields and preserved undefined display name. Full API coverage
passed 1,147 tests in 156 suites with all four DB/Redis opt-ins enabled, zero
skips and normal exit 0 (89.922 seconds). Editor, Storage, Worker, Web and
dependency-patch test commands also passed. Final acceptance is pending.

Workspace typecheck, lint, Prisma validation and build passed. Architecture initially
rejected the three new technical exports; its exact allowlist now names only
the approved additions. A further registration ownership regression pins root's
single shared-row delegate, IAM's role/assignment-only delegates and rejection
of feature business/foreign infrastructure imports. The final architecture gate
passed all 139 tests with zero baseline findings (not exhaustive certification).
Global format remains red on 41 existing files; production dependency audit
reports one high and nine moderate findings. Neither is waived by this packet.

Full migrated E2E completed 508 assertions: 507 passed, one failed, zero skipped
(48 suites, 423.930 seconds). The only failed assertion is the inherited
DEBT-045 News `viewCount` null/zero expectation. App passed all 26 cases,
including registration's actual database assignment rollback. This does not
close the separate intermittent App timeout debt. The completed Jest process
retained handles after writing its JSON report. With zero DB clients and zero
`api_boundary_%` schemas, only verified Jest PID 13840 was stopped; the shell
reported `e2e=-1`, not a normal green exit. No rerun or timeout change was used.

GraphQL generation succeeded but the consistency command failed on inherited
DEBT-044 generated `eslint-disable` drift. Only this run's generated drift was
removed; schema/generated files then match Git exactly. SDL SHA-256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
The generation gate is still recorded red, not waived after cleanup.

Manual review confirms exact owner query/data projections and unchanged error
propagation, post-commit behavior and transaction options. This is not independent
review or green-baseline acceptance.

## Publication

Implementation/evidence commit `97e9957` is pushed in
[draft PR #57](https://github.com/clearfixx/dss-universe/pull/57), stacked on
`debt/d4-file-graph-config-cycle`. Initial checks at that exact head were queued:
main quality, dependency audit, Web smoke and Linux/Windows containment.
No CI success, merge or independent acceptance is claimed. This publication
link is a documentation-only follow-up; it does not change verified runtime.

## Scope remaining

This packet does not close exhaustive D4 operation reconciliation, D4.5
acceptance, D5–D7 or the planned subsequent stack-boundary audit. Phase 11
requires the remaining preparation gates and its separate owner brainstorm.
The user-owned untracked stack audit plan is untouched.
