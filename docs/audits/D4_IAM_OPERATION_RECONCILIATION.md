# D4 — IAM persistence operation reconciliation

Review started 2026-10-19; final local verification recorded 2026-10-20.
Branch `debt/d4-iam-operation-reconciliation`, based on
`e38c5bf` / draft PR #59 (unaccepted).

## Source boundary and outcome

All fourteen current non-test sources under IAM `infrastructure/repositories`
are reviewed, including the three missed by lexical Prisma/SQL discovery:
membership projection, delegating revocation repository and registration writer.
All five application/safety services, group validation, four REST controllers,
module/public/technical entries, relevant contracts, root read/transaction/group
adapters, JWT/permission guards and the access-group migration are traced.
Selected role DTOs and the actual Prisma error mapper clarify boundary behavior;
this is not a claim to have audited every DTO, Core/Users source or platform race.

IAM owns assignments, role/permission metadata, group policy and grant history.
It does not query profile or credential fields. Shared physical `users` relation
fragments contain only IAM relations; Auth owns the root anchor/existence.
Core Authorization evaluates access; Auth supplies eligibility. Root composes
these boundaries without leaking a transaction through business contracts.

No new security defect is confirmed by this tranche. Existing DEBT-047 remains
open; owner/Command Deck product decisions are not silently implemented here.
One residual public export is removed within D4's surface-minimization scope.

## Owned operation matrix

| Owner source / operations                                                  | Exact facts / writes                                                                                      | Transaction and interpretation                                                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Role repository: findIdByName, findRecordById                              | ID lookup; ID/name/label/description/isSystem record                                                      | Independent reads, no profile/credentials                                                            |
| Role repository: findById, findAll                                         | role record plus permission ID/key/label/description                                                      | Roles name ascending; nested permission key ascending                                                |
| Role repository: create                                                    | name/label/description and nested permission assignments                                                  | One nested create is atomic; duplicate/missing permission insertion rolls back the role              |
| Role repository: update, remove                                            | explicit metadata update; role deletion by ID                                                             | Safety is in service; no new mutation Audit or availability policy                                   |
| Role repository: permissionExists, countPermissions, hasPermission         | permission IDs or composite role/permission assignment                                                    | Count uses found distinct rows; no generic user aggregate                                            |
| Role repository: assignPermission, revokePermission                        | owned role_permissions INSERT/DELETE                                                                      | Service check/write/read are separate, not one protected availability transaction                    |
| Permission repository: findIdByKey, findAll, findById                      | ID/key/label/description/createdAt/updatedAt                                                              | List key ascending; missing ID returns null                                                          |
| Permission repository: createWithAudit                                     | allowlisted permission INSERT and actor/system Audit                                                      | Same transaction; Audit failure rolls both back                                                      |
| Permission repository: update, remove                                      | explicit metadata update; permission DELETE                                                               | Existing unaudited mutation policy retained, not upgraded to complete security audit coverage        |
| Subject access: subjectExists, findAssignments                             | delegated Auth existence / root-composed IAM facts                                                        | All-state ID existence; not ACTIVE eligibility; missing assignment anchor returns null               |
| Subject access: roleExists, permissionExists, hasRole, hasDirectPermission | ID/composite-key existence only                                                                           | No foreign SQL or transaction lifetime                                                               |
| Subject access: grantRole, grantPermission, revokePermission               | owned user_roles/user_permissions writes                                                                  | Separate service checks and summary read; no new Audit/Outbox                                        |
| Role revocation repository / writer                                        | delegates → role lock → role name / assignment → current holder count → synchronous IAM check → DELETE    | Root keeps Read Committed; policy/storage failure rolls back; only assignment-holder safety          |
| Registration role writer                                                   | baseline `user` role ID and subject/role INSERT                                                           | Root owns shared registration INSERT/transaction; no credential/profile access in IAM                |
| Group list, findById                                                       | explicit group identity/display/kind/enabled flags and sorted capability keys                             | Cursor ID ascending, bounded take; immutable identity is distinct from editable appearance           |
| Group memberships                                                          | explicit grant/revocation history fields                                                                  | Group/subject filter, ID cursor ascending; includes history, not only effective membership           |
| Group create                                                               | owned group + nested capabilities + Audit                                                                 | Atomic; maps known unique-key conflict only                                                          |
| Group update                                                               | group lock; before read; explicit enable/display update; before/after Audit                               | Atomic; missing returns null; identity/kind/capabilities not updated through this path               |
| Group setCapabilities                                                      | group lock; before read; delete/recreate closed capabilities; Audit; readback                             | Atomic; database trigger separately rejects Premium capabilities                                     |
| Group grant / writer                                                       | root transaction → group lock/enabled → Auth-owned ID existence callback → immutable grant INSERT + Audit | No new ACTIVE target filter; no separate existence transaction                                       |
| Group revoke                                                               | membership lock/read; first revocation metadata update + Audit                                            | Missing returns null; repeat returns prior record without another Audit; preserves first attribution |
| Group effectiveMemberships                                                 | enabled groups with nonrevoked membership and validFrom <= at < validUntil (or indefinite)                | Reads current facts; overlap collapses to one group, no worker expiry cleanup or positive cache      |
| Group publicGroups                                                         | same effectiveness plus isPublic; key/name/color/badge/icon only                                          | Private membership still authorizes but is absent from public appearance                             |
| Role display reader                                                        | userRole subject ID + role name, assignedAt ascending                                                     | Empty input still queries; no eligibility inference or permission projection                         |
| Role permission-key reader                                                 | rolePermission key projection for named roles                                                             | Empty names short-circuit; first-seen dedup, no new sort/cache                                       |
| Assignment shape / mapper                                                  | ordered role ID/name/permission keys and direct ID/key                                                    | No Auth fields; management summary sorts the combined unique keys, not an access decision            |
| Authorization shape / mapper                                               | legacy unsorted role names and permission keys                                                            | Missing returns empty; first-seen dedup; root retains one nested query                               |
| Profile-role shape / membership shape                                      | case-insensitive role membership predicate / eleven history fields                                        | Guarded technical projection, not arbitrary profile selection or staff authority                     |

## Policy and transport reconciliation

Role CRUD and assignment controllers apply JWT plus explicit permission guards.
Permission management uses permissions.manage, read uses permissions.read.
User-access summary requires users.read; role grants/revokes require roles.update;
direct permissions require permissions.manage. Group routes use permissions.manage
and derive actor ID from the authenticated principal, not a body field. Group
service independently checks current management authority on every command/read.

JwtStrategy first validates current session/ACTIVE/version, then root's current
Authorization context populates request roles/permissions. PermissionsGuard uses
that request context, not stale JWT claims or a role-name superuser bypass. This
does not make all administrative commands globally linearizable with concurrent
authority revocation after the check.

Core capability policy checks ACTIVE eligibility before group management,
Guardian or audience decisions. Premium cannot add generic permissions or
Guardian; Guardian is only KNOWLEDGE_FORGE_GUARDIAN. Custom groups use `group:`
audiences, roles use `role:` (with bounded legacy aliases), so matching display
names cannot impersonate staff roles. Current membership facts use one supplied
evaluation time. Private public-display flags do not remove access membership.
Premium threshold bypass only applies after audience access, not to all sections.

The actual migration enforces fixed Premium key/kind and uniqueness, immutable
group identity/grant history/completed revocation, increasing validity intervals,
restricting foreign keys and Premium capability denial. Group disable does not
delete content or history. These checks are not a completed owner/moderation
product, registration policy builder or Command Deck step-up implementation.

Service-level duplicate checks do not replace database constraints. For example,
role permission IDs are deduplicated for existence counting but the original
array is persisted: duplicate nested assignments fail atomically. The existing
Prisma mapper maps P2002 to conflict and P2003 to bad request. This is not an
unverified assertion of a new HTTP 500 or partial role creation defect.

DEBT-046 protects the final assignment of each protected role; inactive holders
still count. Role-permission changes and permission key mutation/deletion do not
apply an administrator-availability predicate. This remains the existing
DEBT-047 concern, not a newly approved policy or a proved irreversible lockout.
The unique owner decisions supersede the old six-key proposal; new owner rights
remain scheduled in their relevant phases.

## Bounded surface cleanup

After registration persistence moved to IAM's owned writer, tracked literal
symbol/reference discovery finds no remaining external consumer of public
REGISTRATION_ROLE_NAME. Its only executable consumer is that
writer's local import; remaining text occurrences are policy definition, public
export, architecture assertions and historical documentation. Remove only the
unused root export and correct the index Passport; keep the policy file/value,
writer query, technical entry and registration transaction unchanged. No files
are deleted. Exact AST export regression is first red on the old entry and then
passes with the narrowed surface. This is not a wholesale public API redesign.

## Local verification

Real DB role, permission, access-group and role-revocation suites were read to
distinguish projections, actual migration triggers, rollback and observed lock
contention from mocked policy checks. Fresh API coverage passes 1,157/1,157 in
156 suites, zero skips, 63.811 seconds, normal exit 0, with all four Auth/IAM
DB/Redis opt-ins. Architecture139/139 (zero inventory findings), lint/types,
Prisma validation, build and Editor/Storage/Worker/Web/dependency-patch commands
pass. The exact narrowed IAM export regression was red before the index change;
all139 architecture cases then pass. No extra test skip or timeout increase.
Global format remains red on 41 existing files; full dependency audit is red
(one high, ten moderate). Old parent results are not presented as this packet's
current verification. Parent PR #59
at exact head e38c5bf remains queued when inspected. No CI/independent review,
green baseline or full D4 acceptance is claimed.

Fresh migrated E2E completed 508 PASS / 1 FAIL / 0 skipped of 509 in 48 suites,
385.191 seconds. App27/27 passes. Only inherited DEBT-045 News viewCount null/zero
fails; a passing App run does not close its separate intermittent timeout debt.
Completed Jest retained handles after writing JSON. Zero DB clients and zero
`api_boundary_%` schemas were verified before stopping only completed Jest PID
16476; shell exit -1 is not a normal green exit. No rerun or timeout increase.

GraphQL generation succeeds; inherited DEBT-044 generated eslint-disable drift
makes consistency red. Only this run's drift is restored; SDL/generated files
then match Git exactly. SDL SHA-256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Packet formatting/diff checks pass. No production file is deleted, no migration,
API, frontend or authorization behavior is changed. These local results do not
waive global red gates or replace independent review/CI acceptance.

## Remaining scope

This reconciles the reviewed IAM persistence family, not all seventeen features,
Core/Worker/root consumers or every transport DTO. D4's wider operation matrix,
D4.5 acceptance, D5–D7, stack-boundary audit and Phase 11 brainstorm remain open.
