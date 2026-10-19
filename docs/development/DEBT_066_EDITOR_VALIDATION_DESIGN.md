# DEBT-066 — Editor validation safety design

2026-10-19. Separate correction authorized; depth value below is proposed,
not yet approved. Design branch based on `829b6ca` / draft PR #45; unaccepted
stack. No runtime, schema, migration, UI or stored document changes in this packet.

## Contract to approve

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

## Required regression matrix

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

Implementation receives its own branch/commit/PR after depth approval and
compatibility assessment. Apply File Passport to materially touched/new source.
Run changed format, full lint/types/tests/coverage, Prisma validation/migrations,
affected HTTP/E2E, production build, architecture/license/dependency and generated
consistency. Preserve known red baseline findings; no acceptance/debt closure until
required full gates, CI/review and owner acceptance. D4 and Phase 11 remain open.
