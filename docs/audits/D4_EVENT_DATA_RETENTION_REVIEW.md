# D4 — Selected producer payload and retention trace

2026-10-19, baseline `8acbb38` / draft PR #46, unaccepted stack.
Documentation-only tranche, not all-producer or transport acceptance.

## Discovery versus completed reads

Current API source search for createEventEnvelope/outbox.append finds 18 files:
one factory and 17 candidate producer files. This is not proof against aliases,
other append methods or raw inserts. Completely read in this tranche: Bookmark
and Reaction repositories, Reputation writer, AchievementEvidenceWriter and
TitleEvidenceWriter. Helper callers received only selected/contextual reads;
their generic payload arguments are **not** certified as an allowlist.
Prior Core review read root Wall/News draft transactions and News workflow;
that historical scope is not silently reclassified as fresh full-owner acceptance.

| Reviewed producer operation | Persisted payload / envelope data                                            | Boundary                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Bookmark save/remove        | bookmarkId, interactionTargetId, ownerId; owner as actor; Bookmark aggregate | Actual transition only, relationship lock and writes/evidence in one transaction; private relationship data, not public feed data |
| Reaction set/change/clear   | reactionId, target ID, actor ID, previous/current kind                       | Target advisory lock, row/aggregate/evidence together; unchanged requests emit no event                                           |
| Reputation direct/reverse   | recipientId, value, optional reversesEntryId; actor/entry in envelope        | Reason stored in Audit, not event payload; locks and owner projection callback precede evidence                                   |
| Achievement award evidence  | award/user/achievement IDs, kind, source type/ID                             | Helper record also accepts arbitrary owner-supplied JSON; remaining callers need full trace                                       |
| Title evidence helper       | owner-supplied record, actor/target envelope                                 | No helper allowlist/redaction; selected grant caller includes free-text reason; not all callers reviewed here                     |

All five pass their existing caller transaction to Audit/Outbox, not a new
transaction. A source-level shared transaction is not proof of every actual
rollback or concurrent outcome; prior migrated owner tests remain separate.
No password/token/profile body is read by these five sources, but free text and
generic caller payloads prevent a universal secret-free assertion.

## Worker and operator trace

Read current Worker main, integration processor wrapper, Activity projector,
DeadLetterService and Core QueueOperationsService. Main binds integration events
only to Activity. Projector handles exactly Wall create/retract and News published;
unrelated Bookmark/Reaction/Reputation/title/achievement events produce no Activity
SQL in this route. Main still lacks production gamification handlers (DEBT-007),
and default processor v1 versus DLQ v2 identity remains DEBT-061; no fix here.

Actual source projector probe with synthetic private Bookmark event records zero
query-boundary calls. It uses a doubled pool, not live DB or HTTP evidence.
Existing projector tests show Wall body and News document fields are not copied
to Activity. News title/slug/tags are internally projected; this is not by itself
public metadata disclosure. Activity transport/later source availability still
require the owner-specific lifecycle trace.

Retention path: full payload goes to Outbox then integration queue. Dispatcher
keeps completed/failed jobs. On terminal failure DLQ service stores the complete
event as JSONB plus raw error reason, then adds the full entry to a retained DLQ
queue. DB insert and DLQ enqueue are separate effects. Worker logs terminal
integration errors as error objects. QueueOperations.listFailed returns raw jobs;
bounded API source search found no current external caller/transport for it, so
no public failed-job endpoint is claimed. Retry and resolvedAt update are not one
transaction and do not prove downstream completion.

Raw error strings, internal relationship IDs and free-text caller fields need
explicit operational retention/access policy. Audit metadata redaction does not
sanitize Outbox/DLQ payloads. No production secrets, live messages or database
payload contents were inspected; no exposure incident is established.

## Verification and outstanding coverage

Fresh Worker tests **46/46 PASS, nine files, normal exit 0**; synthetic Bookmark
probe zero queries. No runtime edits or live queue request. Markdown format/diff
checks required. Full runtime gate not rerun for documentation only; parent red
format/dependency/GraphQL/E2E/retained-handle findings remain.

Still required: full helper-caller closure; remaining Levels/Points/Interactions
moderation/target/comment/mention and News taxonomy/settings/pin/link payload
definitions and consumers; aliases/raw-write discovery; lifecycle, operator
transport and retention decisions. D4 operation reconciliation/D4.4/D4.5, D5–D7,
stack audit and Phase 11 brainstorm remain open. No debt closure/green release.

## Follow-up: remaining lexical producer definitions

At `bc6c42a`, read complete News taxonomy/settings/pin/link repositories,
Interaction target and moderation repositories, Comment writer, manual Achievement
and Title grant writers. Read Levels/Points evidence methods and every current
Achievement/Title helper call construction plus titlePayload. Revisited root Wall
and News draft/workflow event-construction regions. This closes payload-definition
tracing for the 17 discovered files, **not** every operation/consumer/lifecycle or
all runtime write-discovery possibilities. Some large repository reads are
method/context-scoped, not complete full-feature source review.

| Producer definition                | Fields added to payload (actor/aggregate generally in envelope)                                                                  | Data boundary                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Levels transition                  | userId, fromLevel, toLevel, direction, balance; source event causation ID                                                        | no profile; occurredAt remains separate source/audit timing contract                                    |
| Community Points award/reversal    | userId, ruleKey, points, optional sourceType/sourceId                                                                            | reason in Audit/ledger, not event payload                                                               |
| Interaction target register/status | targetId, kind, ownerModule/type/ID, status, reason                                                                              | optional free text, not identifiers only                                                                |
| Comment create/edit/tombstone      | commentId, targetId, authorId, parentId, reason                                                                                  | body/document/search text excluded; tombstone reason retained                                           |
| Mention create/retract             | mention/comment/target IDs, actorId, recipientId                                                                                 | no body/username; transition Audit actor may differ from event's original mention actor                 |
| Report create/review               | report/target/comment/reporter IDs, category/status/reviewer ID                                                                  | report/review reason in Audit, not payload                                                              |
| Annotation create/revoke           | annotation/target/comment IDs, kind, actor, expiry/revocation times and actor                                                    | reason in Audit, not payload                                                                            |
| News taxonomy create               | category slug/parent; tag slug; field key/type/category/postType                                                                 | field options/labels/descriptions excluded                                                              |
| News settings update               | six typed pagination settings and default settings ID                                                                            | spread of input values, not a runtime extra-key allowlist                                               |
| News pin set/remove                | article/pin IDs, scope/category, expiry                                                                                          | article content excluded                                                                                |
| News link create/remove            | source/target IDs, type; create also anchorText/position                                                                         | authored free-text anchor on creation                                                                   |
| Achievement definition/rule        | definition ID/key/name/active; rule ID/achievement/eventName/enabled                                                             | owner-helper callers select fields; no entire rule/definition spread                                    |
| Achievement award/revoke           | award/user/achievement IDs, kind/source coordinates                                                                              | helper excludes award and revocation reason from both payload and its Audit metadata                    |
| Title definition/update            | title ID/name/slug/color/badge/active                                                                                            | description excluded                                                                                    |
| Title grant/revoke/select/settings | grant/user/title IDs, grant/revoke reason; selected IDs; selectionCooldownDays                                                   | free-text reason retained on grant/revoke, not on selection                                             |
| Root Wall create/retract           | profileOwnerId, create hasImage Boolean                                                                                          | no body, media ID/path or deletion reason in Wall event; target-status event separately includes reason |
| Root News draft create/save        | article/author/revision IDs, versions/status; create postType/language/slug                                                      | no canonical document/full text                                                                         |
| News workflow/status notification  | transition/version/decision/reason/times; title/slug/language/visibility/indexing/category/tags; notification audience/recipient | unpublished discovery metadata is internally retained; protected body excluded                          |

The table has more rows than files where one producer defines several event
families. Previous Bookmark/Reaction/Reputation rows remain applicable. Generic
helpers still accept arbitrary owner JSON; tracing today's callers does not turn
their signatures into enforced minimization policy for future callers.

Bounded runtime search across apps/packages for outbox_events, direct Prisma
create/createMany/upsert and SQL INSERT found only Core OutboxWriter's create
outside tests. This is supporting discovery, not proof against dynamic SQL,
indirect aliases, other languages or out-of-repository writers.

Actual-source ts-node probes with doubled Audit/Outbox boundaries confirm that
Reputation puts synthetic reason only in Audit, while Comment tombstone includes
it in both Audit and event. Only payload key names/Boolean results emitted; no
real user data, DB write or network call. Private writer probes do not certify
HTTP authorization, transaction rollback, live retention or consumer behavior.

Remaining work is now consumer/lifecycle/retention reconciliation, independent
operation coverage and D4.4/D4.5 rather than re-reading these same payload
definitions. No event keys were removed/renamed, versions changed or historical
payload rewritten. Fresh Markdown checks required; prior Worker 46-test result
is from this unchanged-runtime packet, not a new full runtime gate here.
