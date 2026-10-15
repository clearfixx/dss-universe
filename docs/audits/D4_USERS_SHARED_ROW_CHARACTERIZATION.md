# D4 — Users shared-row characterization foundation

Date: 2026-10-15. Status: local characterization verified; runtime transfer and
release acceptance OPEN. Branch `debt/d4-users-shared-row-boundary`, based on
`d8d368e` / draft PR #20. No unaccepted/red parent is merged.

## Outcome and non-goals

The [operation inventory and proposed design](../development/D4_USERS_SHARED_ROW_BOUNDARY_PLAN.md)
covers all mapped Users shared-row and IAM role paths. The new migrated E2E suite
records current behavior before production ownership changes. Production source
is unchanged: Users still loads legacy shared records and reads IAM role data.
Passing safe-response characterization does not prove secret-free persistence.

The owner explicitly approved root owner-fragment assembly on 2026-10-15 through
a separate question. Runtime implementation follows in its own bounded package;
permission is not inferred from a passing test or the broad D4 objective. This foundation is not a
role-only substitute for the full shared-row transfer.

## Observations

**20 migrated E2E PASS**, zero skipped, normal exit (5.844 s). Real AppModule runs
against all 54 migrations in an owned loopback dss_test schema. Fixtures are
synthetic repository subjects and roles; they do not certify authentication or
effective authorization. No successful security decision is mocked.

- ID/email/username reads each issue one independent query, accept every existing
  account state and retain null for missing records. Service missing-user behavior
  is unchanged.
- Public ID/username and ID-batch lookups require ACTIVE. Ordinary existence is
  not equivalent to account eligibility. Duplicate input IDs do not duplicate
  result rows; empty input still emits its existing query.
- All five directory sort modes, tied creation timestamps, lastSeen null-last,
  pages beyond the end and totals match the exact parent Prisma algorithm on the
  same fixture. Search, case-insensitive role membership, state and IDs remain
  combined before count and pagination. Absent IDs differ from an empty filter.
- Each directory operation emits row SELECT then count SELECT and COMMIT, not
  independent role/status prefetches. A test-only call-through spy of the pinned
  engine records maxWait 2000 ms, timeout 5000 ms and no isolation override for
  the real batch transaction. Production does not use private engine APIs.
- Role display retains exact name case, assignment timestamp ordering, empty
  arrays for missing/unassigned IDs and roles for inactive subjects. It is display,
  not a staff-access decision. An empty batch retains the user_roles lookup.
- The sixteen-field viewer response sees newly committed email/verification
  facts in one lookup. DTO timestamps retain their existing serialization.
- Profile cleaning, tag deduplication and requested updates leave all observed
  synthetic credentials/account fields unchanged. Missing UPDATE retains P2025
  and does not create a subject. No credential setter has been implemented here.

The suite deliberately compares safe projections rather than endorsing the old
raw-record secret shape. Future runtime tests must additionally prove that raw
repository results and selected SQL omit credentials, disallowed runtime update
fields cannot persist, owner fragments are guarded and failures propagate.

## Full quality evidence

Fresh API opt-in unit/integration coverage: **985 PASS / 142 suites**, zero skipped,
normal exit (74.806 s), all four Auth/recovery/IAM DB and Auth Redis opt-ins.
All **26 existing thresholds** pass; none changed or lowered.

Root lint/typecheck, Prisma validation, production build and architecture/license
checks PASS. Build executes the API task and reuses five unchanged cached outputs
(18.808 s). All **68 existing architecture fixtures PASS**; frozen inventory stays
**89**, without waiver/growth. No new production boundary is certified by that
unchanged inventory.

Fresh adjacent tests PASS: Editor **23**, Storage **43**, Worker **36**, Web **59**,
with existing coverage gates where configured. All **14** patch regressions PASS.
Global format remains red on **41 inherited files**; dependency audit remains
**1 high / 10 moderate**. GraphQL consistency remains red on DEBT-044 generated
barrel comment/newline drift; the own generated side effect is restored to exact
parent hash `af783993600932bfe5466bd5413fc8b4c85c021c`.

Final full API E2E: **392 PASS / 1 FAIL**, 393 tests / 38 suites, zero skipped
(255.880 s). All 20 new characterizations and all 26 Auth cases pass. The single
failure matches DEBT-045 News foundation viewCount null/zero expectation and
protected interaction-target cleanup. DEBT-048 does not reproduce, not a claim
that the separate debt is fixed.

Only the verified owned tmpfs PostgreSQL project on loopback 5435 was recreated
from zero public tables with 54 migrations and no seed. Dev 5433 and unit base
5434 were not reset. Complete JSON was emitted, but retained handles prevented
normal exit. Only verified own completed Jest PID 21340 was stopped after checking
zero active DB connections and zero owned test schemas. This is not a successful
process exit or full green gate. No timeouts were raised, tests skipped or history
protections disabled.

No browser/dev server was started; no new full browser success is claimed. No
production source, canonical GraphQL/Prisma schema, migration, dependency, authored
frontend, timeout, isolation, scoring/access policy or owner feature is changed.
The owner-authored untracked stack audit plan is untouched and unstaged.

Ignored local evidence: `node_modules/.cache/dss-d4-users-shared-row-*` and current
API coverage artifacts. These do not replace durable CI/review acceptance.

## Next and remaining gates

The owner-approved technical assembly is next: implement and verify the complete inventory, including
ViewerProfileReader, directory and profile update responses; do not stop at role
display. Remaining transactional subject checks, full SQL/Worker review,
D4.4/D4.5, D5–D7, requested stack audit and owner acceptance stay required.
DEBT-057 remains separate. Phase 11 still requires its mandatory brainstorm after
preparation and stack-audit acceptance.
