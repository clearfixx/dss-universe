# D4 — Users shared-row and IAM role boundary

Date: 2026-10-15. Status: characterization implemented; runtime design explicitly
owner-approved and locally implemented in a separate runtime increment, acceptance open.
Foundation branch `debt/d4-users-shared-row-boundary`, based on
`d8d368e` / draft PR #20. The parent stack is unaccepted, not a release baseline.

## Problem and complete scope

The D4 inventory explicitly includes Users' whole shared-row reads and IAM role
joins. `PrismaUsersRepository` currently loads credentials and account internals
with unselected reads/updates. Its role-name query directly reads userRole/role;
its directory predicate traverses the same IAM relations. Users' public response
mappers already copy an explicit safe allowlist. That protects transport output,
but does not establish persistence ownership or remove secrets from Users.

The physically shared users table remains permitted by ADR-003. Do not split
identity, create another mutable status, introduce tables or make security facts
eventually consistent. This package must cover ordinary lookup, ACTIVE/public
lookup, directory filtering/count/pages, profile write responses, role display and
the existing ViewerProfileReader. A role-display-only patch would leave the
shared-row problem open and is not the completion criterion.

## Current operation inventory

| Operation                                    | Current query/behavior                                                                                   | Required disposition                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| ID/email/username lookup                     | One independent findUnique; all account states                                                           | One safe composed lookup; preserve null/domain errors                        |
| Public ID/username, batch IDs                | ACTIVE filter; no additional status/age/privacy policy in repository                                     | Auth owns state predicate; preserve empty-ID query and duplicate behavior    |
| Directory                                    | Batch findMany then count, default transaction; shared status + profile search/sort + IAM role predicate | Compose owner fragments without prefetching roles/status outside the query   |
| Role names                                   | Independent userRole + nested role-name reads; assignedAt ASC; no ACTIVE filter                          | IAM-owned display reader; Users-owned input port/root adapter                |
| Profile, lastSeen, avatar/cover setters      | Shared-row UPDATE and returned record                                                                    | Profile-only input, safe composed result, no credential/state write          |
| ViewerProfileReader                          | One independent 16-field findUnique                                                                      | Reuse the safe composed lookup, not a second temporal read                   |
| Unused Users credential/status setters       | markEmailVerified/changePasswordHash/changeStatus have no call sites                                     | Remove from Users; preserve working Auth operations                          |
| Unused raw-record reads/generic write/delete | Internal compatibility methods/contract operations, no production callers                                | Remove or narrow after exact call-site review, never recreate a broad facade |

Searches cover source and tests. `app.e2e-spec.ts` invokes Auth's credential
repository, not Users' similarly named setter. No public Users credential/status
endpoint or published UsersService is present. No new deletion or owner policy is
authorized by removing unused compatibility methods.

## Owner-approved runtime design

The owner explicitly approved this owner-fragment/root composition boundary on
2026-10-15, including removal of unused Users credential/status commands, without
new tables, API changes or isolation/timeout changes. Working Auth operations
remain unchanged. Implement it as a separate bounded runtime package after this
characterization checkpoint; approval is not runtime or release acceptance.

Subsequent local runtime implementation: `debt/d4-users-owned-profile-composition`;
see [runtime evidence](../audits/D4_USERS_OWNED_PROFILE_COMPOSITION.md). The
foundation results below remain historical pre-transfer evidence.

Owners publish operation-specific guarded infrastructure fragments. Only root
infrastructure/assembly and the owner's own infrastructure can import them:

- Users: its thirteen profile/identity/technical metadata selections, profile
  search/sort/ID/username predicates and explicit profile-only update data.
- Auth: exactly email, status and emailVerifiedAt for this presentation,
  email lookup and state predicates. No password/hash/session/authVersion/abuse
  projection. These display facts are not effective authorization decisions.
- IAM: directory role-membership predicate, retaining case-insensitive name
  matching. An independently published narrow role-display reader owns the
  existing assignment query/order, without importing Users or Auth.

Root composes the shared physical-row query from those fragments behind a
Users-owned semantic profile persistence port. The existing internal repository
delegates, and returns only the sixteen supported display fields. Its domain
record/update/options types must contain no credentials or Prisma representations.
Role display uses a separate Users-owned input port, not that persistence port.

Preserve one query for independent reads and the existing lazy Prisma batch
transaction for directory rows/count. Keep the default isolation and installed
acquisition/timeout budgets. No positive cache, role-ID prefetch, post-update
profile fetch, parallel response hydration, raw client business contract,
generic fragment-builder framework or foreign feature service is introduced.

This is a shared-row-specific technical assembly, not permission for feature
modules to select foreign columns or import each other's infrastructure. Root
performs assembly only; owner fragments retain the actual selected fields and
filter/update rules. Pure operation-specific fragments receive primitives, never
a business repository aggregate or credentials.

## Characterization before production changes

`apps/api/test/users-shared-row-ownership.e2e-spec.ts` uses actual AppModule and
all real migrations in an owned disposable schema. Synthetic rows/roles are
repository fixtures, not authentication success evidence. The suite verifies:

- all four statuses across ordinary/public/batch lookup and missing behavior;
- five sort modes, tied timestamps, null-last lastSeen, count/page and beyond-last
  metadata, differentially against the exact parent directory algorithm;
- combined search/role/status/ID predicates before count/pagination, and empty
  versus absent ID filters;
- exact role-name case and assignment order, inactive subjects, missing and empty
  inputs, without inventing a staff or eligibility decision;
- safe response keys and fresh Auth display facts in the viewer projection;
- profile cleaning and unchanged synthetic credential/account values after writes;
- genuine one-query independent reads and two SELECTs + COMMIT for directory;
- test-only call-through observation of installed engine start defaults. Private
  engine APIs never enter production.

Final pre-transfer characterization: **20 PASS**, zero skipped, normal exit
(5.840 s), including the additional transaction-default probe. Full quality
results are tracked in [foundation evidence](../audits/D4_USERS_SHARED_ROW_CHARACTERIZATION.md);
this plan is not a full
quality, runtime isolation or release acceptance certificate.

## Implementation verification requirements

During the separately approved runtime transfer, add raw repository/SQL allowlist tests proving secrets
are no longer selected, forbidden update fields cannot persist even through a
malformed runtime input, and provider failures never synthesize profiles/roles.
Pin named exports, guarded fragment ownership and absence of foreign relations
in feature persistence. Retain all characterization and privacy/access regressions.
Check the installed query schedule and transaction options, not just imports.

Run changed/global format, root lint/typecheck, Prisma validation, full opt-in API
unit/integration/coverage, API E2E, adjacent workspace/patch tests, production build,
architecture/license/baseline, generated consistency and dependency audit. Record
inherited failures and terminal process status without waivers or timeout changes.
No canonical schema/frontend/dependency edits. Publish its own draft review PR;
do not merge red parents. The owner-authored untracked stack audit plan is excluded.

## Remaining pre-Phase-11 work

This package does not replace remaining transaction-local subject checks in
Achievements/Custom Titles/IAM, full delegate/relation/raw-SQL/Worker review,
D4.4/D4.5, D5–D7, requested stack audit, owner acceptance or the mandatory
Phase 11 brainstorm. DEBT-057 remains separate and unimplemented.
