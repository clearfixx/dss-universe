# DEBT-066 — Editor validation safety design

Initial design: 2026-10-19, historically based on `829b6ca` / draft PR #45.
Owner subsequently approved depth 64, root depth 0, with compatibility checks
before implementation. The separate implementation branch is now
`debt/debt-066-editor-validation-safety`, from accepted main
`a35326afdd4ebba484540a46f468c82d4bb586a9`. No schema, migration, UI or stored
document rewrite is authorized. Earlier pending-approval statements below are
historical checkpoints, superseded by this explicit approval.

## Approved contract

- Maximum node depth **64**, root `content.type=doc` at depth **0**; every child
  increments depth, including inline text. Apply equally to all eight profiles.
- No automatic truncation, flattening, profile change or silent repair.
- Shared validator returns invalid result with bounded structured errors for
  malformed node/container/marks and over-depth documents, not TypeError/RangeError.
- Existing API normalizer maps invalid results to BadRequestException; GraphQL
  error response follows existing Nest/Apollo mapping, not a promised HTTP 400
  transport status. Owning mutations must leave no content/evidence side effects.
- Preserve schemaVersion 1, existing profile/node/character limits, allowed
  nodes/marks, links/IDs, footnote/TOC rules and canonical output for valid inputs.
  This nevertheless tightens previously unbounded nesting and needs approval.

## Implementation direction

Keep shared validation in `packages/editor`, not duplicated in API. Traverse
untrusted values only after checking non-null record/type, optional attrs shape,
marks array and content array; validate mark records/attrs before access. Use
bounded traversal that checks depth/node budgets before descending. Never run
the document-grade traversal over malformed nodes; pair/TOC checks must consume
only safely visited structure or run after structural validity. Preserve existing
error order/messages where meaningful; do not catch arbitrary exceptions and
pretend the document was valid or merely empty.

Prefer an explicit iterative walk so rejection does not depend on JS call-stack
size. If retaining any secondary recursive projection/rendering, it receives only
validated depth-bounded documents. This does not authorize a full renderer rewrite,
new storage model, rate-limit system or broad sanitation/unknown-field policy.
Any confirmed adjacent defect is documented separately.

## Compatibility gate before code changes

Inventory tracked synthetic fixtures and current persisted canonical-document
owners first. Use read-only aggregate counts/depth summaries in explicitly scoped
available local stores; never print document bodies, credentials or private text.
Record environments and inaccessible stores as limitations, not zero findings.
If legitimate saved documents exceed the proposed depth, stop for an owner
decision; no migration, data rewrite, hard deletion or relaxed hidden exception.
Production is not accessed by this authorization.

Initial schema discovery identifies five persisted document columns:
NewsArticle.document, NewsRevision.document, Comment.document (nullable),
CommentDraft.document and CommentRevision.document. Their source/migration and
available local database contents still need reconciliation; this inventory is
not a completed depth scan or proof that every JSON field is canonical content.

### Local compatibility evidence (2026-10-19)

Docker inventory confirms loopback-only PostgreSQL containers at 5433 (dev),
5434 (persistent tests), 5435 (disposable tests). Information-schema discovery in
each public schema finds exactly the five document columns above. Queried each
using `psql -X -v ON_ERROR_STOP=1` in an explicit `BEGIN READ ONLY` transaction;
no credentials, document bodies, row IDs or text were emitted. Recursive JSONB
walk follows only array-valued content from root depth 0, stopping at depth 65
to detect any value beyond the proposed 64 without unbounded descent.

| Environment           | Table             | Rows | SQL-null documents | Maximum observed node depth | Beyond 64 |
| --------------------- | ----------------- | ---: | -----------------: | --------------------------: | --------: |
| dev 5433              | all five          |    0 |                  0 |              not applicable |         0 |
| persistent tests 5434 | all five          |    0 |                  0 |              not applicable |         0 |
| disposable tests 5435 | news_articles     |    1 |                  0 |                           2 |         0 |
| disposable tests 5435 | news_revisions    |    3 |                  0 |                           2 |         0 |
| disposable tests 5435 | comments          |    2 |                  1 |                           2 |         0 |
| disposable tests 5435 | comment_revisions |    3 |                  0 |                           2 |         0 |
| disposable tests 5435 | comment_drafts    |    0 |                  0 |              not applicable |         0 |

Aggregate nested node/type/content/marks-container shape check found no malformed
document among these eight non-null values. This is not full shared validation:
attrs/mark items/profile/links/footnotes and every dynamic test fixture still need
their own checks. Data are current local/test state only; no production, backups,
other databases/schemas or remote instance was accessed/certified. No resets,
seed, migration or data edits. Empty stores prove no existing local incompatibility,
not universal compatibility. Exact depth approval remains pending.

Current shared source probe via ts-node (not only existing build) accepts NEWS
documents with deepest text at depths 64 and 65, 2250/2284 bytes. The same source
throws RangeError at depth 12000, 408074 bytes. Synthetic JSON built textually to
avoid generator-side stringify recursion; no persistence or network. This makes
the proposed 65 rejection an explicit compatibility tightening, not an already
enforced rule. Earlier 408108-byte depth fixture counted 12000 blockquotes plus
its terminal text; these separately described probes are not identical depths.

## Required regression matrix

### Refreshed compatibility checkpoint (2026-10-25, before correction)

Prisma still declares exactly five persisted document columns. Read-only
information-schema discovery in public schemas of dev 5433 and disposable 5434
finds the same five. Each aggregate scan runs within `BEGIN READ ONLY` and
`ROLLBACK`, follows only array-valued content and stops at depth 65. No document
text, credentials or row IDs were emitted; no migration, reset or rewrite ran.

Dev public tables are empty. Disposable public contains 15 non-null comment
revisions and 10 comments, five with SQL-null documents; the other three owners
are empty. All 20 non-null documents have maximum observed depth 2; no visited
node exceeds depth 64. Other schemas, backups, production and unavailable port
5435 are not certified by this observation.

A literal-only TypeScript AST inventory scanned 272 tracked test/spec files and
found 15 explicit object wrappers with assigned schemaVersion/profile/content:
8 currently valid (COMMENT/FORUM_REPLY/WIKI), 3 invalid, 4 not statically
resolvable. Maximum valid static depth is 4. This intentionally does not execute
arbitrary fixture code or claim coverage of shorthand wrappers, dynamic factories
or generated JSON. Manual inspection identifies shared content arrays in
document-grade tests and parameterized public-search factories; these are also
covered by the unchanged Editor baseline, 23/23 in three files. The baseline
includes valid empty documents for all eight profiles. Later full API/E2E
regressions remain required; this is not universal compatibility certification.

Ignored reproducible observations: `node_modules/.cache/debt066-current-compat.sql`,
`debt066-fixture-inventory.cjs` and `debt066-fixture-inventory.json` in the same
directory. Baseline Editor build and tests pass before source correction.

### Shared implementation checkpoint (2026-10-25, acceptance open)

New safety tests initially produced 22 failures and 38 passes across four files;
the original 23 tests remained passing. Log:
`TEMP/dss-debt066-before-correction.log`. No validation implementation had been
changed at that point.

The shared validator now performs an iterative structural preflight before its
existing semantic passes. A cursor frame advances one child at a time, bounding
auxiliary stack growth by depth rather than array width. It rejects over-depth,
over-node-budget and malformed node/content/marks/attrs shapes with a controlled
validation result. Semantic traversal receives only structurally safe documents
within depth 64 and the existing profile node limit. The recursive semantic
rules, canonical valid-object identity and profile/character limits remain.

Current shared tests pass **65/65 in four files**. They pin all eight profiles at
depths 64/65, malformed values, the 12000-level parsed JSON, legal empty optional
containers and exact node-budget acceptance. A test-only getter sentinel beyond
the node budget proves early stopping without representing a JSON exploit.
Editor typecheck and lint pass. No API runtime, DTO, Prisma, migration or UI
change is included yet. API/HTTP/host rollback regressions, full quality gate,
CI and acceptance remain required; do not mark DEBT-066 closed.

### API verification and transport decision (2026-10-25)

Actual API normalize/preview/delivery tests use the freshly built shared package,
not a mocked validator. Fifteen tests across three suites pass, including seven
new unsafe-input cases, depth12000 rejection before renderer/gate IO, depth64
canonical input preservation and the existing UTF-8 byte limit.

The first real AppModule HTTP suite in an owned migrated schema is **red**:
15 failures, 2 passes. The two positive controls prove real depth64 preview,
delivery and successful News create/update. Every invalid-input case reaches a
controlled Editor BadRequest, but the assertion expecting BAD_USER_INPUT/400
fails because the actual public extensions are `{code: INTERNAL_SERVER_ERROR}`.
Post-denial persistence assertions in those failing tests have not been reached;
do not claim their success. Log: `TEMP/dss-debt066-http-regressions.log`.

A separate filtered characterization of the previously forbidden `html` node
confirms the inherited mechanism: `BadRequestException.getStatus()` is400, but
its custom response object lacks statusCode. The installed Nest Apollo adapter
requires both response.statusCode and exception.status before transformation.
Thus the existing formatter receives an internal-error code. This is not caused
by the new depth policy. The filtered run passes1 case and skips17 by explicit
name selection; it is **not** a full passing suite. Log:
`TEMP/dss-debt066-inherited-mapping.log`.

Owner decision requested before a compatibility change: add statusCode400 only
to EditorService's structured validation exception, allowing the current adapter
and unchanged formatter to produce BAD_USER_INPUT with extensions.statusCode400.
HTTP200 and successful API responses remain unchanged. No global formatter or
Domain exception refactor is proposed here. Until approval, production API
service code and the strong failing HTTP assertions remain unchanged. No full
quality gate or acceptance is claimed.

### Independent persistence regressions while transport approval is pending

Five additional cases call the actual NewsService create/save commands with the
same malformed/depth65 documents in the owned migrated AppModule schema. Each
asserts BadRequestException, unchanged News/revision/comment/interaction/media
reference/Audit/Outbox counts after both rejected commands, and exact unchanged
existing draft fields. These cases pass5/5. Log:
`TEMP/dss-debt066-host-persistence.log`. The explicit filtered run skips18 other
cases; it is not a complete green HTTP suite and does not replace its failing
transport assertions. Actual GraphQL authentication remains exercised by fixture
setup; the direct command checks make no claim about transport error codes.

All Editor-owned API unit suites now pass46/46 in8 suites, including real shared
validation and mocked downstream IO only. Targeted lint passes. The inherited
GraphQL mapping decision is still pending; production EditorService and global
formatter are unchanged. No skips were added to source tests, no assertions were
weakened and no full gate/CI acceptance is claimed.

| Layer              | Evidence required                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared             | null/primitive/array node; object/string/null optional containers; non-record marks/attrs; no uncaught runtime error                                          |
| Bounds             | exact 64 accepted if otherwise valid, 65 rejected; root/inline accounting pinned; 12000-level JSON rejected without stack exhaustion; early node-budget bound |
| Existing contracts | every profile, Unicode/byte limit, legal lists/tables/footnotes/TOC, canonical JSON unchanged; no truncation                                                  |
| API                | source normalization/preview/delivery reject malformed input before rendering/gate IO, preserving error mapping                                               |
| HTTP/GraphQL       | authenticated existing endpoints reject synthetic malformed/deep input via controlled errors; no internal stack disclosure; valid request afterward succeeds  |
| Host mutation      | use a real existing host path where applicable; failed validation leaves content/revision/Audit/Outbox unchanged in migrated disposable DB                    |

Add deterministic tests before correction; distinguish failing-defect proof from
passing corrected behavior. Never raise Jest timeouts or suppress errors to pass.
Actual gate effects, not mock-only HTTP assertions, are required for acceptance.

## Delivery

### Approved local transport correction — 2026-10-25

Owner approved adding `statusCode: 400` to EditorService's existing structured
validation error. Only that local error response changes: the installed adapter
can now map it to `BAD_USER_INPUT` with `extensions.statusCode: 400`. HTTP200,
successful responses, structured validation errors and the global formatter
remain unchanged. The previously inherited unsupported-node characterization
now asserts this approved contract; the strong malformed/depth HTTP assertions
remain intact. This supersedes the pending-decision statements above without
erasing their observed failures.

After switching from D7, the first diagnostic unit run used D7's older generated
shared dist and therefore is not an error-mapping-only red proof. Rebuilding
the current shared Editor removes that stale-artifact confounder: seven cases
then fail specifically on missing response.statusCode, while two valid/size
controls pass. No test retries, timeout increase or runtime workaround is used.
Full corrected verification, CI and owner acceptance remain required.

Corrected targeted verification now passes: shared65/65, all Editor API units
46/46 in8 suites, and the complete HTTP/host suite23/23 with zero pending/todo.
That suite retains exact error extensions, no internal stack disclosure, unchanged
host counts/draft fields and the valid depth64 preview/delivery/create/save
controls. JSON `node_modules/.cache/debt066-corrected-http.json`, SHA256
`52AE5E20E0205B253CAA30FD99837F2ACEBC0A0F14BA82097854831AC2F9D23F`.
Targeted formatting and lint pass; this is not the consolidated gate or CI.
The installed Next generator's H2 heading is synchronized in its generated
AGENTS block only, avoiding known build/dev documentation drift; no UI changes.

### Accepted-main compatibility checkpoint — 2026-10-27

Integration `6c0d788` merges accepted main `b63d555` (including DEBT-087) into
PR89 without conflicts or new application changes. On this integration, shared
Editor65/65, targeted API validation units9/9 and real authenticated HTTP/host
regressions23/23 pass, with no pending tests. Current shared dist was built before
API verification, avoiding the previously documented stale-artifact confounder.
The HTTP suite retains malformed/depth65 rejection, valid depth64 requests and
unchanged host state/evidence assertions. Report
`node_modules/.cache/debt066-http-6c0d788.json`, SHA256
`67c420a895cdca78f37609205d2982bb71f35fcb58261dcf2f2f6acc0cad727f`.

These are compatibility checks, not a current full-gate certificate or owner
acceptance. PR96 arrival integration is independently verified but awaits owner
acceptance; do not silently absorb that unaccepted runtime package or use its
green gate as PR89 evidence. The complete PR89 integration gate/CI remains open.

Implementation receives its own branch/commit/PR after depth approval and
compatibility assessment. Apply File Passport to materially touched/new source.
Run changed format, full lint/types/tests/coverage, Prisma validation/migrations,
affected HTTP/E2E, production build, architecture/license/dependency and generated
consistency. Preserve known red baseline findings; no acceptance/debt closure until
required full gates, CI/review and owner acceptance. D4 and Phase 11 remain open.
