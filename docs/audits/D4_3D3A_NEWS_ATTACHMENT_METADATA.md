# D4.3d3a — News public attachment metadata ownership

Date: 2026-10-14. Branch: `debt/d4-module-boundaries`, draft PR #10.
Increment base: `5bff17f`. Ownership implementation locally verified; final-head
CI/review acceptance OPEN. This does not complete D4.3d3, D4 or readiness.
Parent D3.5 PR #9 is unaccepted; no red PR is merged.

## Critical newly confirmed blockers

DEBT-052: a guest public Full News response includes synthetic denied contentGate
text in documentJson. The independent Editor delivery redacts it correctly, but
the Full News response path does not invoke that boundary. This is a confirmed
server-response disclosure and blocks release/Phase 11 readiness. Characterization
tests explicitly retain the vulnerable baseline; their passing status is not
security acceptance. The owner approved a separate priority correction on
2026-10-14; implementation and acceptance remain OPEN.

DEBT-051: canonical EditorDocument wraps the doc node in object-valued content;
the inherited attachment visitor descends only array-valued content. Real
NewsService creation stores files/references, yet Full News lists no attachments.
The old increment-base visitor reproduces the same failure. This transfer preserves
it rather than silently introducing a behavior change. The owner approved a
separate correction on 2026-10-14, after DEBT-052; it is not implemented here.
See [debt register](../development/DEBT_REGISTER.md). No real private data was read.

## Full D4.3d3 sequence and this transfer

News delivery combines independent reads with transactional rating/comment and
numbered-page reads. Do not split transactions into unprotected owner calls merely
to remove imports. This first subincrement transfers the already independent Media
attachment query; remaining Users/Interactions queries and their consistency
requirements remain explicit D4 work.

Media publishes a generic narrow public-reference metadata reader. It selects
only the existing reference ID/media ID, filename, MIME/extension, size and three
checksums, plus its existing public-original delivery URL. No bucket, storage key,
scan/internal metadata or full Media row crosses the contract. Active reference
coordinates and READY/PUBLIC/non-deleted file predicates are unchanged. Empty
requested sets skip storage; no matches omit files; storage/provider errors propagate.

The root adapter fixes NewsArticle/news.attachment coordinates and selects only
the News-owned input fields. Media does not import News or know its document policy.
News application owns label extraction, contentGate subtree exclusion, first
position/last label, provider duplicate-reference resolution and display kind.
Its full delivery read composes attachments only after a matching eligible article.
Invalid addresses still throw synchronously; absent articles do not read metadata.

News persistence returns the same full projection except the application-composed
attachment array. No Media delegate remains there. The separate metadata read stays
after existing article/sharing reads; no transaction/cache/snapshot contract is
introduced or split. Rating/comment/numbered transaction algorithms are unchanged.
No API/GraphQL schema, Prisma model/migration, dependency, frontend, owner/Command
Deck or Phase 11 feature change. Backend guidance preserves existing NestJS and
assigns only the operation-specific read/projection responsibilities to owners.

## Verification

- Focused pure tests: 56 PASS across four suites.
- Full serial opt-in units: API 794 / Web 59 / Worker 36 PASS, all DB/Redis opt-ins.
- New migrated AppModule E2E: 25 PASS, including two explicit defect characterizations.
- Eleven exact AST body comparisons match: browsing/numbered/navigation/rating/
  comments/filtering/rows/mapping/pins/neighbors/display kind. The old and new
  visitors agree on thirteen JSON shapes, including the inherited canonical omission.
- Root lint/typecheck: PASS; no rules disabled.
- Architecture/license/baseline: PASS, 52 fixtures, unchanged 89 import findings,
  no added findings/exemptions. Bounded delegate regression pins the absence of
  Media queries, not approval of remaining Users/Interactions joins.
- Prisma validation/status: PASS, 53 current migrations; no schema changes.
- Complete relevant D4 E2E: 153 PASS across thirteen suites, including explicit
  defect characterizations, not proof of corrected security or full API/Web E2E.
- Full scoped coverage: PASS, API 702 passed / 92 opt-ins separately verified;
  Web/Worker/Storage pass with unchanged thresholds.
- Production build: PASS, serial `--concurrency=1`; API fresh, five unchanged builds cached.
- Changed-file Passport/format/diff: PASS; final static rerun before commit.
- Global format RED: same 41 legacy files (DEBT-022). Generated consistency RED:
  only the inherited barrel lint comment (DEBT-044), restored from the initially
  clean file; no frontend/schema diff remains. Audit RED: 1 high / 10 moderate
  (DEBT-016), with 14 patch regressions PASS, not an audit waiver.
- No existing/new blocker is waived. Full API/Web E2E, final-head CI and review stay OPEN.

Thirty-nine new pure tests pin exact public metadata selections, array ownership,
fixed coordinates, null checksums/missing results, error propagation, traversal/
hidden-subtree pruning/order/deduplication, display kind and full-response composition.
No successful empty projection substitutes for failed evidence.

E2E uses actual AppModule root bindings and all 53 migrations in owned disposable
schemas. NewsService creates canonical drafts and references; publication status
is a controlled fixture, not a claim of editorial workflow verification. Legacy
doc-node documents are deliberately labeled DB fixtures for the old working
traversal path, not a claim that canonical publication works. Tests verify every
non-ready status, all non-public visibility values, removed/wrong/missing references,
deleted files, audience short-circuit, duplicate document labels, unchanged GraphQL
fields and no storage-field leakage. Binary upload/download is not newly verified
from metadata fixtures. Unused Shiki is the only compatibility substitution; real
presence refreshes are awaited before cleanup. No immutable-history trigger or
constraint is disabled.

A post-E2E query confirms zero remaining `api_boundary_*` schemas. Only owned
disposable schemas were removed; dev/production databases were not changed.

## CI and remaining obligations

The preceding head `5bff17f` Quality run `38496166012` is completed/failed at
Unit tests with coverage: repeated Web unhandled window-is-not-defined error,
attributed to editor-ai-dialog.spec.tsx (DEBT-050). API E2E/generated/build were
skipped, not hung on that run. Web smoke/audit also fail; storage passes on both OS.
No manual restart/cancellation. Evaluate the new head independently after publishing.

Critical DEBT-052 takes priority under the owner's 2026-10-14 approval. See the
[security implementation plan](../development/DEBT_052_FULL_NEWS_REDACTION_PLAN.md).
DEBT-051 is
separate functional correction, not silently bundled. Remaining D4.3d3:
Users author projections and Interactions joins/sharing/reaction/comment pages,
preserving existing transaction/ordering/pagination/redaction contracts. Atomic
mention resolution, Reputation display/history, Users role/shared-row reads and
transaction-local subject checks remain D4.3/D4.4. Complete relation/delegate/
raw-SQL/Worker review before D4.5. D4.4/D4.5 plus D5–D7 remain required.
Stop before Phase 11 for mandatory brainstorm; no readiness claim while DEBT-052 is open.

## Publication checkpoint

The first attempted commit/push did not execute: automatic approval review failed
on its usage limit, not a safety determination. A subsequent read-only account
check allowed ordinary work; the same escalated approval route then succeeded
without a bypass. D4.3d3a is committed/pushed as `5851381` in draft PR #10.
The separate `debt/debt-052-full-news-redaction` branch starts from that exact
published head. This report describes the ownership increment's baseline,
not acceptance of the subsequent security correction or its adjacent findings.
