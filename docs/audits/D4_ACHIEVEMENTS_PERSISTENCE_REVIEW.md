# D4 — Achievements persistence review (partial)

Date: 2026-10-18. Baseline `f72edda` / PR #35, acceptance open.
Branch `debt/d4-achievements-persistence-review`. No runtime changes.
Untracked DEBT-063 retry design remains separate, awaiting exact CAS confirmation.

Complete reads: PrismaAchievementsRepository, PrismaManualAwardWriter,
AchievementEvidenceWriter, award shape, AchievementsService and root
PrismaManualAwardTransaction. Transport/assembly/schema/current test reconciliation
is still pending; this is not full feature acceptance.

| Operation                      | Ownership, policy and consistency                                                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| definitions/writeDefinition    | Owned definitions; active filter optional, name/id ASC. Global definitions lock; missing ID returns NOT_FOUND, create/update plus Audit/Outbox same transaction; P2002 becomes CONFLICT, other errors propagate.                                                                                    |
| rules/writeRule                | Owned rule with definition relation, enabled optional, event/id ASC. Global rules lock; checks definition/existing rule, then create/update/evidence atomically. Active definition is not required for write.                                                                                       |
| matchingRules                  | Event/enabled and active definition, ID ASC; policy loaded before consumption lock, so mutable-rule freshness remains unproved.                                                                                                                                                                     |
| consume                        | User/achievement pair advisory lock before processed, active-award, cooldown and daily-cap reads. Consumer identity includes rule ID. Nonrepeatable active award yields IGNORED marker, cooldown/cap yields CAPPED marker; successful award/processed/Audit/Outbox same transaction.                |
| dailyCount                     | User/rule UTC-day originals with revocation null. Unlike Points defect, this count is under shared user/achievement lock. Revoked awards no longer count; this is current policy, not changed here.                                                                                                 |
| manualAward                    | Delegates through semantic ManualAwardTransaction; no foreign profile SQL in owned repository.                                                                                                                                                                                                      |
| manual writer/root transaction | Same user/achievement lock as automatic consume; parallel Boolean recipient existence, active definition, active award. Missing-user precedence, then missing definition, then conflict. Root supplies Users-owned ID-only existence in same default transaction. No ACTIVE-status filter invented. |
| revoke                         | Award-specific lock; missing/already-revoked result, append revocation plus evidence. Does not use pair/source locks; interactions with those operations require actual concurrency tests.                                                                                                          |
| rollbackSource                 | Source-coordinate lock; reads active awards ordered ID, appends revocations and evidence in one transaction. No source tombstone. Late award/source reversal and individual revoke overlap remain unproved, not declared fixed.                                                                     |
| awards                         | User scope, optional revoked, owned definition/revocation relation; awardedAt DESC/id DESC. No foreign profile projection.                                                                                                                                                                          |
| evidence writer                | Same caller transaction, Audit before versioned Outbox. IDs/kind/source coordinates; nullable actor omitted for system events. No credentials/profile/body payload.                                                                                                                                 |
| mapping/lock/conflict helpers  | Owned rows/relations, transaction advisory coordinate, P2002 classification. Not a public broad business contract.                                                                                                                                                                                  |

Service validates definitions/rules/reasons/event payload; existence comes through
consumer-owned profile port. Event matching may process several rules in separate
repository transactions, not all-rules atomicity. Source rollback is chosen from
reversedSourceType/reversedSourceId payload; producer/event authorization must be
traced before calling that a trusted external command. No public exploit claimed.
Achievements do not confer permission; automatic production wiring remains the
separately documented DEBT-007 acceptance gap, not solved by repository tests.

Next evidence: transport permission/read visibility, current schema constraints,
existing manual/automatic concurrency and rollback regressions. Preserve original
review boundaries: no blanket “safe” claim based on one lock or absence of foreign
SQL in the repository. User stack audit plan untouched.

## Transport, schema and test reconciliation

Complete additional reads: resolver, GraphQL models, module, schema achievement
blocks and entire achievements-foundation E2E suite. Service unit suite freshly
passes 8/8, 0.778s (policy validation/routing/reversal/conflict/reason cases).

Definitions and active awards require JWT. Admin definitions/rules/history and
all mutations require JWT + PermissionsGuard + AchievementsManage. Authenticated
active-award lookup accepts any userId; it does not apply profile privacy/block
context. Exposed award fields include reason, actor ID and source coordinates;
sourceEventId is not declared. This is current transport behavior requiring
privacy-contract reconciliation, not a proven new unauthorized disclosure.
No direct live authorization test is claimed from source reading.

Schema: definition key/slug unique (name itself is not unique); rule unique on
achievement/event; award unique on achievement/sourceEventId; one revocation per
award. Award recipient/definition/rule relations use restrictive deletion.
These constraints do not replace logical locks or prove overlapping rollback
correctness. Module exports no concrete providers; root manual transaction uses
guarded infrastructure entries.

The existing foundation E2E covers concurrent same-event AWARDED/DUPLICATE,
nonrepeatable IGNORE, sequential daily cap and reopening after revocation,
manual award/revoke, source rollback, history and immutable-award update denial.
It directly calls the service consumer, not a production queue route. Audit and
Outbox assertions are global lower bounds, not per-command exact rollback proof.
afterAll deletes all Achievements-producer Outbox rows in its database; do not
run against dev or concurrently with other suites needing those records.
This suite was inspected, not newly executed at this checkpoint. Different-event
daily-cap interleaving, revoke versus source rollback, rule freshness and
all-command atomic evidence remain separate verification requirements.

## New migrated owner regression

`achievement-award-atomicity.e2e-spec.ts` passes 2/2, 4.637s, normal exit, actual
repository/Audit/Outbox with fully migrated private schema. Two distinct event
calls at dailyCap=1 yield AWARDED/CAPPED, exact award/marker/Audit/Outbox counts
`[1,2,1,1]`; repeat delivery remains DUPLICATE with unchanged counts. Injected
Outbox failure leaves `[0,0,0,0]`, then identical-event retry awards with
`[1,1,1,1]`. Manual command is unused and throws if unexpectedly called.
No history protection bypass or dev reset. This provides actual transactional
evidence, not global queue wiring or deterministic coverage of every concurrent
schedule. Full packet gates/publication remain pending.

Deterministic follow-up now passes with all three migrated cases, 6.647s.
Observer holds the first actual dailyCount after obtaining its PostgreSQL PID;
pg_locks confirms a waiter on that exact holder before release. Actual quota
reads are `[0,1]`, ordered outcomes AWARDED/CAPPED and exact evidence `[1,2,1,1]`.
The bounded test coordination does not raise transaction/Jest deadlines or change
isolation. Finally releases the barrier and settles both owned calls before
fixture cleanup. This proves that tested pair-lock schedule, not revoke/source
rollback overlap, live queue delivery or all possible rule-policy changes.

Exact DEBT-063 CAS boundary was confirmed by owner while this audit gate ran;
its separate design is authorized, not part of this Achievements production scope.
Initial final lint caught require-await in the unused manual-command test stub;
removed unnecessary async, no suppression. Corrected lint/full packet gate still
pending at this checkpoint; typecheck passed. No green acceptance inferred.

Corrected lint subsequently passes. Current full API coverage: 1101/1101,
148 suites, zero skipped, 61.362s with all four DB/Redis opt-ins and existing
thresholds retained. Typecheck/Prisma/build/architecture pass; baseline remains
84 known findings. Global format still 41 inherited files, audit one high/ten
moderate. Full E2E started on verified project/service/tmpfs/loopback5435 target
after zero-client check, recreation, empty public-table check and fresh migration
deployment, no seed. Its final report and adjacent package gates remain pending.

Adjacent gates subsequently pass: Editor 23, Storage 43 coverage, Worker 36
coverage, Web 59 coverage (maxWorkers=2), dependency patches 14. Full E2E session
29982 remains live at this checkpoint; no complete JSON yet, no rerun or cleanup
attempt. No production/fixture edits during that run. Final E2E/GraphQL evidence
and draft PR publication remain pending; the global gate is not green.

Final full E2E: 484 PASS / 1 FAIL of 485, zero skipped, 378.242s. All three new
atomicity cases pass. Sole failure is inherited DEBT-045 News viewCount expected
null/actual zero at line 478. Complete JSON preceded retained handles; exact own
PID 25292 stopped after zero DB clients and zero fixture schemas, not normal
green completion. GraphQL check remains red on DEBT-044 generated-barrel drift;
its own comment/newline side effect restored, schema and operations unchanged.
No production changes. CI/review/owner acceptance remains open.
