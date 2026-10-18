# D4 — Custom Titles persistence review (partial)

Date: 2026-10-18. Baseline `2159cb9` / draft PR #37; acceptance open.
Branch `debt/d4-custom-titles-persistence-review`. No runtime changes.

Complete reads: PrismaCustomTitlesRepository, PrismaTitleGrantWriter,
TitleEvidenceWriter, grant shape, root PrismaTitleGrantTransaction, GraphQL
resolver and schema blocks for definitions/grants/selections/settings. Subsequent
service/input/model/module and migration reads are recorded below.

| Operation               | Ownership and exact schedule                                                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| definitions             | Owned definitions, active filter optional; name/id ASC.                                                                                                                                                                                                                    |
| create/update           | Global definitions lock; create/update plus Audit/Outbox in one transaction. P2002 becomes CONFLICT, other errors propagate. Deactivation first deletes selections referencing grants of the title in that transaction.                                                    |
| grants                  | User-scoped owned grants, optional revoked inclusion; title plus Boolean selected projection; grantedAt DESC/id DESC.                                                                                                                                                      |
| grant/root writer       | Root owns default transaction and Users ID-only Boolean existence. Writer locks user/title pair; parallel recipient, active title and active grant reads; result precedence user missing, title missing, conflict. Insert/evidence atomic; no profile/credentials exposed. |
| revoke                  | Grant-ID lock; read grant/selection, missing/already-revoked outcomes; delete selected row if observed, update revocation fields, evidence same transaction. Different lock from select and pair grant.                                                                    |
| select                  | Per-user selection lock; parallel active owned grant, current selection and global settings reads. Reject missing/inactive; same grant UNCHANGED before cooldown. Upsert selection/time and evidence atomically.                                                           |
| settings/updateSettings | Reads required global row (missing throws, no in-memory default). Settings lock on upsert/update/evidence; distinct from selection lock.                                                                                                                                   |
| evidence                | Audit then versioned integration Outbox in caller transaction, actor and title/grant IDs. Grant/revoke reasons included in payload; retention/privacy review still required.                                                                                               |
| mapping                 | Explicit grant fields including reasons/actor/revocation and title, selected=Boolean(selection). No User aggregate or permission grant.                                                                                                                                    |

Schema name/slug unique; selection userId primary key and grantId unique; grants
reference User/title with restrictive deletion. Migration adds a partial unique
active user/title grant index not represented by Prisma schema: both that index
and logical writer lock are material. FK does not encode nonrevoked/active
title predicate or selection's user matching its grant; application maintains it.

Transport: authenticated definitions/grants/settings; admin definitions and
grant/create/update/revoke protected by CustomTitlesManage; global settings writes
by CustomTitlesSettingsManage. Self-selection userId only from authenticated actor.
Authenticated grant query accepts any userId; exposed metadata requires model and
privacy-contract reconciliation, not a presumption of unauthorized disclosure.

Deterministic migrated schedules below confirm select versus revoke/deactivate
using different locks (DEBT-064). Settings changes between selection checks and
grant versus revoke remain unproved; source-level suspicion alone is not proof.
No new role, entitlement, permission or Premium behavior is introduced.

Remaining: actual selection/evidence rollback and other cross-operation
interleavings where needed, plus final gate and acceptance reconciliation.
This is not complete D4 acceptance or a runtime correction. User stack audit plan
untouched.

Complete follow-up reads: service, GraphQL models and full foundation migration.
Service tests pass 8/8, 0.927s. Service validates presentation/reasons/cooldown
(0..3650), maps missing/conflict/cooldown outcomes and keeps titles independent
of authorization. Models expose grant reasons/actor/revocation metadata to the
authenticated grants query; privacy expectations remain to be reconciled.
Migration enforces title color/name/badge, grant lifecycle/reason and cooldown
checks, inserts the global settings row and prevents historical grant deletion.
The initial schema-only statement about absent active-pair uniqueness was
corrected after reading the actual partial index. No checks/triggers disabled.

Actual migrated diagnostic `custom-title-selection-audit.e2e-spec.ts` passes
1/1, 2.846s: Prisma query extension pauses only after a real eligible-grant read;
actual repository revoke commits, then select resumes and commits OK. Final
selection references a grant whose revokedAt is non-null. This confirms DEBT-064
select/revoke lifecycle race, not permission escalation or a completed fix.
No successful query results fabricated, history checks disabled or isolation/
transaction deadlines changed. pg emits a concurrent-query deprecation warning
from existing parallel reads on one transaction client; not suppressed.
At that diagnostic checkpoint deactivation was still unproved; the follow-up
below supersedes it. No runtime change in this audit.

Follow-up extends the same real-read barrier to repository deactivation. Both
diagnostics pass 2/2, 4.433s: revoke leaves selected revoked grant; deactivate
leaves selected inactive title. A subsequent sequential select returns NOT_FOUND
or INACTIVE respectively, proving ordinary policy differs from the raced final
state. Earlier “deactivation unproved” is superseded by this actual migrated
evidence. Correction request already includes selection/revoke/deactivate; no
runtime fix or permission escalation is claimed. Audit gate/publication pending.

Complete additional reads: all five GraphQL input files, module and public index.
Inputs remain DTO-only and service adds semantic checks (e.g. six-digit color).
Concrete service is exported from module/index; source search finds only own
resolver/assembly/tests, not foreign feature consumers. This is a D4.4 public
surface cleanup candidate, not a reason to weaken existing guard policy.
Current gate evidence is recorded below.

Owner approved DEBT-064 as a separate correction package on 2026-10-18.
Selection/revoke/deactivate serialization and deterministic DB regressions must
preserve cooldown, history, Audit/Outbox and API. No correction is included here;
the exact shared-lock design remains the next package's work.

Current audit gates: root lint/typecheck/build and Prisma validation pass;
API coverage passes 1101/1101 across 148 suites with DB/Redis opt-ins enabled
(82.445s). Editor passes 23 tests and dependency-patch checks pass 14 tests.
Storage coverage passes 43 tests, Worker 46 tests and Web 59 tests.
Frozen architecture inventory remains 84 known findings, not waived.
Global format still reports 41 inherited files; dependency audit reports
1 high and 10 moderate vulnerabilities. These are not green acceptance.
Full API E2E ran against the verified disposable tmpfs container at
loopback 5435 after zero-client verification and recreation, with migrations
applied and no seed. Development DB 5433 is untouched. Final E2E and GraphQL
results follow below; CI/review and acceptance remain pending.

Full E2E: 483 PASS / 1 FAIL / 0 skipped, 484 tests across 46 suites,
364.946s. Only failure is inherited DEBT-045 at news-domain-foundation:478,
expected viewCount null versus actual 0. Both new Custom Titles diagnostics pass.
Jest retained handles after writing complete results; after verifying zero DB
clients and zero api_boundary fixture schemas, only this run's exact PID 2800
was stopped. Shell exit is 1, not normal green completion.
GraphQL generation succeeds but check is red for inherited DEBT-044 only:
generated barrel comment/newline drift. This command's own side effect was
restored; schema.gql and operation outputs are unchanged. No check is waived.
Published draft PR #38 against debt/media-automatic-retry; no merge requested.
