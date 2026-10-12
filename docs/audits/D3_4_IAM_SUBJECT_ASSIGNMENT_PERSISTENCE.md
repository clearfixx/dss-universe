# D3.4 — IAM subject-assignment persistence boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: persistence transfer implemented; public contracts and acceptance remain open.

## Result

UserAccessService no longer imports Prisma or the database module. A private
SubjectAccessRepository provides explicit assignment facts and ordinary writes.
PrismaSubjectAccessRepository owns selectors, existence queries and mutation
details. Its output contains only opaque subject ID, ordered role IDs/names and
permission keys, and ordered direct permission IDs/keys. It exposes neither
profiles/credentials nor ORM relation wrappers or transaction clients.

The service still owns missing/duplicate decisions, public summary mapping and
the sorted distinct union of role/direct permission keys. Legacy public
`userId` and direct permission `name` fields, assignment order and response shapes
are unchanged. DTOs remain transport-only. Private tokens and adapters are not
exported from IAM.

The ordinary repository deliberately has no role-revocation operation. That path
still uses DEBT-046's separate locked transaction and application safety callback.
General reads/ordinary writes retain their existing separate check/write/read
sequencing and audit policy. The transfer does not claim newly atomic grants,
rollback after a later summary-read error, or a redesigned concurrent-conflict
HTTP policy. Database unique/FK constraints remain authoritative.

No dependencies, schema, migrations, GraphQL operations or frontend changes.
Source headers follow File Passport 3.1; new imports/exports are named.

## Evidence

- Eight new service tests cover exact summary allowlisting (including an
  intentionally over-broad fixture), sorted/deduplicated permission union,
  detached output, missing/read failures, grant conflicts, missing subjects,
  roles and permissions, absent direct assignments and mutation failure.
- Three real DB tests use an owned random schema and copied production-shaped
  tables with explicit matching foreign keys. They verify exact safe projection
  with populated profile/credential fields, chronological assignment ordering,
  existence/missing outcomes, concurrent unique grants, FK failures and direct
  revocation without deleting the same role-derived permission.
- Final focused assignment/protected-revocation service/DB run: 28 pass, 2.403s.
- Full uncached units with Auth/recovery/Redis/IAM DB opt-ins: API 103 suites /
  524 tests, Web 59, Worker 36 pass; API duration 38.796s. The later test mock
  naming/formatting repair changes no production behavior.
- Eight real authorization HTTP/GraphQL E2E pass, 13.26s. New coverage verifies
  safe summaries, authentication/permission denial before mutation, direct/role
  overlap, duplicates/missing records and fresh post-revocation summaries.
  Same-token authorization and protected last-holder regressions still pass.
- Monorepo lint, typecheck, Prisma validation and build pass. An initial lint
  fixture chain-format error was repaired without disabling rules.
- Architecture fixtures: 28 pass; legacy subset, editor license and baseline
  checks pass. Exactly the resolved UserAccessService database import was removed
  from the baseline: 141 to 140 known findings, none added.
- Root format remains red on 41 inherited files. Full API E2E was not rerun;
  the previous 44/46 result and News cleanup/open-handle failures remain DEBT-045.
  Dependency audit, Web smoke, GraphQL generation consistency and required CI
  remain unresolved acceptance gates, not waived by focused success.

CI observed on previous head `c366738`: Windows/Linux containment passed,
dependency audit and Web smoke failed, aggregate quality remained in progress.
These observations do not certify the new assignment transfer.

## Remaining work

Review IAM/Auth public exports and consumers, broader usable-administrator
lifecycle guarantees and D3 acceptance. The three IAM application services now
use owned persistence boundaries, but that fact alone does not close D3 or imply
generic groups/Premium implementation. D3.5 and Phase 11 require their respective
scope/brainstorm gates. Do not merge this draft while required checks are red.
