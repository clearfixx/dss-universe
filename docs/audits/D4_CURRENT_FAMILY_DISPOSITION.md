# D4 — Current family disposition and stop checkpoint

Date: 2026-10-21. Base: `5dc388af67089728dbda5943d425055aaef01c19` / draft PR72.
Branch: `audit/d4-current-family-disposition`.
Disposition: architecture implementation reconciled; formal acceptance OPEN.
The owner explicitly approved stopping here after final verification, without
starting D5/D6 corrections or waiving red gates.

## Evidence method and scope

This is a current-state/delta reconciliation, not another blanket source audit.
The existing operation reports identify the original reviewed methods/context.
Git comparison against each named source base identifies subsequent runtime
changes; current changed behavior/surfaces are checked against the separate
correction/composition evidence. Unchanged source does not enlarge the scope of
an older review or prove every optional concurrency schedule.

There are17 feature directories and634 tracked non-test TypeScript sources under
them. API/Worker src together have840 such files, fingerprint
`fa5787bd5d25135463eaf72f5bf62fc07170243788124e898bed3bda4e8efa3a`.
Exclude declarations and spec/test/e2e-spec files; sort project-relative paths,
hash path + newline + raw bytes + newline. The remaining206 files belong to
cross-cutting/root/Worker scope, not additional feature modules.

The delta table counts62 distinct added/modified/deleted paths, not62 defects or
62 currently existing files. Four whole families have no runtime delta from
their named bases. A first discovery probe wrongly assumed every module had
index.ts; the corrected inventory distinguishes absent Notifications barrel
from a wildcard. No source was changed to satisfy that probe.

## Seventeen-family disposition

All rows are structural/operation reconciliation, **not** release acceptance or
proof of complete product functionality. Counts include all current non-test
module sources; the cited reports retain their own narrower complete-read scope.

| Family           | Current files | Compare base | Delta paths | Current boundary and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------: | ------------ | ----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Achievements     |            19 | `f72edda`    |           0 | Same owned definitions/rules/awards/revocations and evidence helpers. Root manual award obtains ID-only Users existence. [Operation report](D4_ACHIEVEMENTS_PERSISTENCE_REVIEW.md), [recipient transactions](D4_GAMIFICATION_RECIPIENT_TRANSACTIONS.md); no concrete service export.                                                                                                                                                                            |
| Activity         |            13 | `0bbb407`    |           0 | Actor-summary read port only; Users owns viewer context. Current Worker DB projection/marker replay is separately verified, not exactly-once or source-availability authority. [Context](D4_3D2_ACTIVITY_VIEWER_CONTEXT.md), [Worker bridge](D4_CORE_WORKER_DELIVERY_RECONCILIATION.md). DEBT067 ordering remains separate.                                                                                                                                     |
| AI Core          |             8 | `9cb91b4`    |           2 | Only module/index narrowing: private inference service/provider, assembly-only named entry. No new network request, capability or full Intelligence completion. [Original boundary](D4_AI_CORE_BOUNDARY_REVIEW.md), [surface correction](D4_4_AI_CORE_EXPLICIT_SURFACE.md).                                                                                                                                                                                     |
| Auth             |            84 | `2dc275c`    |           1 | Only account-credential adapter changes: email mutation invalidates obsolete proof under the same subject lock; password mutation does not delete email proof. No Users profile authority. [Lifecycle](D4_AUTH_LIFECYCLE_OPERATION_REVIEW.md), [DEBT068](DEBT_068_VERIFICATION_DESTINATION_FIX.md). DEBT047 owner availability policy is not silently solved.                                                                                                   |
| Community Points |            15 | `0bbb407`    |           1 | Owned ledger/rules; event lock precedes user/rule/UTC-day quota lock. Existing formula, evidence/idempotency and default isolation retained. [Operations](D4_PERSISTENCE_REVIEW_MATRIX.md), [DEBT062](DEBT_062_POINTS_CAP_AUDIT.md). Live production routing remains DEBT007.                                                                                                                                                                                   |
| Content Access   |            19 | `3def394`    |           8 | Two named management capabilities delegate to private owned policy; wire enums/resolvers move to root, no sibling Editor import. [Operations](D4_CONTENT_ACCESS_OPERATION_REVIEW.md), [approved composition](D4_4_CONTENT_PRESENTATION_COMPOSITION.md). No new entitlement/counter policy.                                                                                                                                                                      |
| Custom Titles    |            19 | `2159cb9`    |           3 | Private service/index plus shared selection/title/revoke locking and post-lock rereads; title remains permission-neutral. [Operations](D4_CUSTOM_TITLES_PERSISTENCE_REVIEW.md), [DEBT064](../development/DEBT_064_SELECTION_DESIGN.md). No ownership/group entitlement invented.                                                                                                                                                                                |
| Editor           |            23 | `c21d80b`    |           9 | Preview/delivery capability adapters allowlist scalars/redacted JSON; root owns former GraphQL presentation. Existing normalization/render/search policy stays owned. [Operations](D4_EDITOR_OPERATION_REVIEW.md), [composition](D4_4_CONTENT_PRESENTATION_COMPOSITION.md). DEBT066 input/depth correction still separate.                                                                                                                                      |
| IAM              |            71 | `e38c5bf`    |           1 | Only unused public registration-role constant export removed; writer/local policy retained. Current role/display/membership inputs remain named and narrow. [Current operation trace](D4_IAM_OPERATION_RECONCILIATION.md); unique-owner product work stays in its relevant phases.                                                                                                                                                                              |
| Interactions     |            62 | `34f3ab6`    |          15 | Explicit GUEST/authenticated viewer propagated through all authorizers, including parent-comment READ; registry rejects malformed viewer contexts. No foreign content model/SQL introduced. [Prior methods](D4_EXIT_OPERATION_RECONCILIATION.md), [DEBT071](../development/DEBT_071_NEWS_INTERACTION_VIEWER_IMPLEMENTATION.md). Precheck/statistics transaction split is the approved retained limit.                                                           |
| Leaderboards     |            12 | `65d8d7b`    |           7 | Owned facts port and rank/page mapping; root one-statement assembly consumes guarded owner fragments. Empty-page total has independent population anchor. [Ownership](D4_LEADERBOARD_RUNTIME_OWNERSHIP.md), [DEBT060](DEBT_060_LEADERBOARD_TOTALS.md). Formula/ties unchanged; D6 fixture isolation is not a ranking rewrite.                                                                                                                                   |
| Levels           |            14 | `0bbb407`    |           0 | Owned definitions/transitions; scalar Points balance input and ID-only recipient composition. No concrete service export or copied Points ledger algorithm. [Operations](D4_PERSISTENCE_REVIEW_MATRIX.md), [recipient composition](D4_GAMIFICATION_RECIPIENT_TRANSACTIONS.md). Not proof that all production consumers are wired.                                                                                                                               |
| Media            |            80 | `87aec38`    |           7 | Library browse/metrics/claim delegate to three-method port; Media owns operations, Users absence predicate is composed at root. Guarded physical READY/PUBLIC write coordinates cleanup, preserving metadata; known P2034 defers the whole rolled-back batch. [Library runtime](D4_MEDIA_PROFILE_ASSET_RUNTIME.md), [DEBT072](../development/DEBT_072_PROFILE_CLEANUP_IMPLEMENTATION.md). Deleted unused wildcard entry is historical, not a new deletion here. |
| News             |            59 | `34f3ab6`    |           3 | Interaction owner receives only guest/authenticated state; current publication/audience/capability checks precede shared effects. Existing owned snapshot/search/redaction/attachment work retained. [Prior operations](D4_EXIT_OPERATION_RECONCILIATION.md), [DEBT071](../development/DEBT_071_NEWS_INTERACTION_VIEWER_IMPLEMENTATION.md). No ACL/Search Platform expansion.                                                                                   |
| Notifications    |             8 | `c0ea01e`    |           1 | Only concrete Nest service export removed; preferences persistence/resolver remain private. No root barrel exists or is required. [Operations](D4_NOTIFICATIONS_PERSISTENCE_REVIEW.md), [surface](D4_NOTIFICATIONS_PRIVATE_SURFACE.md). Preferences are not a complete delivery platform.                                                                                                                                                                       |
| Reputation       |            23 | `34f3ab6`    |           0 | Owned immutable signed ledger and scalar total port; root history/write composition preserves projection/order/atomic evidence. [Current methods](D4_EXIT_OPERATION_RECONCILIATION.md), [write](D4_REPUTATION_WRITE_OWNERSHIP.md), [read](D4_REPUTATION_READ_OWNERSHIP.md). Account/block prechecks are not an atomic revocation promise.                                                                                                                       |
| Users            |           105 | `34f3ab6`    |           4 | Social/block lists now use batched viewer-safe profile projection sharing the single-read evaluator; missing/failed privacy evidence fails closed. Edge paging/order/totals stay owned. [Prior methods](D4_EXIT_OPERATION_RECONCILIATION.md), [DEBT070](../development/DEBT_070_SOCIAL_PROFILE_PRIVACY.md). Profile ownership is not Auth credential ownership.                                                                                                 |

## Current surfaces and cross-cutting composition

AST inspection of all17 module decorators finds no concrete broad application
service in Nest exports. Exported runtime values are specific capability tokens;
Achievements, AI Core, Custom Titles, Leaderboards, Levels and Notifications have
no Nest exports. Sixteen current public index files have named exports only;
Notifications has none. These are source facts, not a certificate about arbitrary
dynamic loading, runtime deployments or the safety of every possible port value.
Mandatory architecture tests additionally guard feature consumers, technical
entries, representation leaks, frozen inventory and compiler-resolved API cycles.

Root transaction/read composition is not another feature owner. The
[eighteen-file SQL review](D4_ROOT_OWNER_SQL_RECONCILIATION.md) has base5372db3;
only two non-test root runtime paths change since that base: profile assignment
and profile-aware cleanup. Both are the owner-approved DEBT072 guard/P2034
correction, with actual DB/HTTP rollback/wait/batch/IO-observer regressions.
Other root owner-fragment read/registration/mentions/permission/ranking algorithms
are unchanged by this delta, retaining their own scoped reports and tests.
No generic ambient transaction, new table or business-port Prisma client appears.

Current content-presentation source registers exactly two root resolvers through
Content Access/Editor capability tokens. Four existing operations retain JWT and
configure permission checks; separate mapping/model/inputs keep DTOs structural.
The single wire-enum registration belongs to root, not one sibling feature.
Current source matches the approved isolated composition direction rather than
the rejected direct transport-enum import exception.

[Core/Worker reconciliation](D4_CORE_WORKER_DELIVERY_RECONCILIATION.md) pins18
explicit source reads plus actual handler-before-marker failure/replay. Auth/
Media-owned delivery SQL, private payload/operator retention and v1/v2 consumer
identity limits remain distinct. Shared technical Audit/Outbox are coordination
infrastructure, not permission for a feature to read another feature aggregate.

## Requirement-by-requirement disposition

| D4 requirement                 | Current implementation evidence                                                                                               | Acceptance boundary                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| D4.1 narrow gamification facts | Owned ID-only existence and scalar balance ports; private services, root recipient composition                                | Current gamification/recipient/subject DB regressions; no invented ACTIVE filter or new score formula                                         |
| D4.2 Reputation/profile assets | Owned account/block facts, root write/read/transport composition; DEBT072 synchronization                                     | Current migrated history/write/profile suites; no global Media lease or every revocation race claim                                           |
| D4.3 content integration       | Owner decisions, explicit viewer, owned SQL/snapshot and atomic target/mention units; Editor/Content Access root presentation | Search/redaction/secondary/related/attachments/policy/target/current viewer regressions; no generic exactly-once or future product completion |
| D4.4 explicit surfaces / ORM   | Current module AST, named entries, guarded technical-only fragments, root wire mapping                                        | No broad-service Nest exports; static rules enforce their defined scope, not unbounded runtime reflection                                     |
| D4.5 enforcement / review      | Mandatory frozen inventory, graph and negative architecture fixtures; current types/build/API/E2E/CI evidence                 | Implementation present; full quality/release/independent-review acceptance remains OPEN while required gates are red                          |

No additional D4 runtime change is proposed by this reconciliation. This is not
debt forgiveness: confirmed separately scoped findings remain in the
[register](../development/DEBT_REGISTER.md), including DEBT047/066/067 and
delivery/retention/stability/fixture/format/dependency/consistency decisions.
Implemented DEBT060/062/063/064/065/068/070/071/072 corrections are not repeated
as unfixed historical runtime findings, but are not promoted to accepted release
by passing local tests. S3/MinIO and shared Search remain agreed deferred scope,
not newly invented Phase11 prerequisites. New owner/Command Deck functionality
stays in its relevant phases.

## Final verification and owner stop

Fresh checks for this documentation-only disposition: lint, typecheck, Prisma
validation/generation, architecture checks, build, Editor, Storage, Worker, Web
and dependency-patch tests passed. API passed1225/1225 across163 suites.
Global format remains red with41 inherited files; dependency audit reports
2 high and12 moderate findings; GraphQL consistency remains red because
generation adds an eslint-disable comment to the generated barrel (DEBT044).
Only that verifier-generated change was restored; no production, tests, schema,
dependencies or frontend code changes are included.

Full E2E was not rerun for this documentation-only checkpoint. The identified
parent PR72 baseline remains585/586 with inherited News failure, new Worker8/
Core11 pass; it is not represented as a new run. Parent sleep-interrupted584/586
remains preserved separately. Required gates and CI acceptance remain open;
publication of a draft is not a green release or permission to merge.

The owner clarified2026-10-21: after this final architecture reconciliation,
stop with **implementation checked, acceptance open**. Do not start D5/D6 fixes,
D7/stack audit or Phase11, merge red PRs, or call the full pre-11 goal complete.
After publication/reporting, pause the active goal at this explicit checkpoint;
resumption requires a new owner command. The untracked owner stack audit plan
stays unchanged and excluded.
