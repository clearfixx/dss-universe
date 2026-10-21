# DEBT-051 — Canonical News attachment manifest

Date: 2026-10-14. Status: IN PROGRESS; owner-approved separate correction.

## Scope and baseline

The owner approved canonical EditorDocument attachment delivery, preserving
contentGate subtree exclusion and current READY/PUBLIC/active-reference policy.
This package follows the approved DEBT-052/053/054 security corrections.

Branch: `debt/debt-051-canonical-attachments`, explicitly stacked on published
DEBT-054 `b4e3d6217123bb4dce5a64081dac19ea19b2f06b` / draft PR #13. Parent
PRs are unaccepted; no red merge or Phase 11 readiness is implied. The owner-authored
untracked stack-audit plan remains separate and untouched.

## Design

News's private attachment projection currently visits array-valued content only.
The canonical NEWS envelope has an object-valued `content` doc root, so its
ordinary attachments never reach Media even when active references exist.

Unwrap only the NEWS envelope's doc root at the projection entry. Retain legacy
node/array component traversal, first-position/last-label deduplication, provider
reference resolution and existing display-kind mapping. Do not recursively visit
arbitrary object properties or introduce a second Editor validation algorithm.
Public Full News continues to consume canonical viewer-redacted JSON from Editor
before composing the manifest. Media keeps eligibility, storage and binary policy.

Every contentGate subtree remains excluded from the separate attachment manifest,
even if the author can view its body. That is the explicitly approved manifest
rule, not a new content-access bypass. No mutation of documents/references, new
API shape, dependency, migration, frontend or wider file-sharing policy.

## Verification

- Turn the inherited omission characterization into a positive canonical
  create/read regression; first prove it fails on unchanged production code.
- Cover canonical nested/duplicate attachments, root-only unwrapping, malformed
  wrapper boundaries and hidden gates in units without replacing Editor validation.
- Exercise real Full News/GraphQL for READY/PUBLIC and excluded media states,
  visibility, deleted files, missing/retired/wrong references, article audience,
  metadata provider errors and current eligibility changes.
- Preserve stored authored JSON/revisions/references and secret-field exclusion.
  Metadata URLs alone do not certify binary download authorization.
- Run full quality gates and report baseline blockers; add an explicit attachment
  service coverage threshold without lowering existing thresholds.
- Commit/push and create a separate draft PR against DEBT-054; review/CI/owner
  acceptance remain separate. Next: remaining D4, then D5–D7, stack audit and
  mandatory Phase 11 brainstorm, not immediate Phase 11 implementation.

## Execution evidence

On the unchanged production service, the new units execute 36 cases: 34 PASS /
2 FAIL (canonical positive/nested extraction). The modified positive canonical
E2E executes 25 cases: 24 PASS/1 FAIL. Both runners exit normally with failing
assertions; this establishes the missing manifest without weakening the tests.

After root-only unwrapping, all 36 projection units and **72 focused E2E PASS**,
zero skipped, normal exit: attachment contracts 29, Full News redaction 20,
related audience 12, viewer-safe search query 11. The latter three remain unchanged
security regressions, not a new manifest-only acceptance shortcut.

Former legacy-only negative fixtures now exercise canonical component and
GraphQL paths for media states, visibility and reference coordinates/lifecycle.
Additional canonical scenarios cover nested/duplicate labels, stored article/
revision/reference preservation, gated IDs excluded from metadata reads even
for an allowed author, current media/reference changes with the same JWT and
real metadata provider failure at Full News. Metadata tests do not claim binary
download authorization. The new service threshold requires 100% statements/
lines/functions and 80% branches; no existing coverage threshold is lowered.

Full opt-in API coverage now passes **898 tests**, 137 suites, zero skipped,
all four DB/Redis opt-ins and all nine file/service thresholds enforced. Other
quality-gate outcomes are recorded below; this is not full acceptance.

Code gates completed: root lint/typecheck, Prisma validation/generation,
production build (fresh API, five unchanged cached outputs), architecture/license
and frozen baseline PASS. The 52 architecture fixtures pass; inventory remains
89 known findings, not a full ownership certificate. Changed-file formatting and
diff check pass. Current global format remains red on 41 inherited files; audit
reports one high/ten moderate; all 14 dependency-patch regressions pass.

The production correction is frozen before full E2E. Its target is the same
verified owned PostgreSQL tmpfs container on 5435, recreated from the committed
Compose file: zero public tables, all 54 migrations, no seed. Only this package's
synthetic test data is replaced; dev and older 5434 DBs are untouched. No timeout,
assertion, DB trigger, API schema or frontend workaround is introduced.

Full API E2E: **259 PASS/3 FAIL**, 27/30 suites, 262 tests, zero skipped,
197.087 seconds. All attachment 29, Full News 20, related 12, search query 11,
search storage 10, search projection 9, performance 5 and atomic composition 17
cases pass. Failures repeat DEBT-045: News viewCount null-versus-zero and
prohibited target-deletion cleanup; registration/GraphQL viewer exceeds the
unchanged five-second deadline; leaderboard observes an earlier tied 10-point
subject. Read-only synthetic-DB inspection confirms the winning `points-user-*`
precedes `leader-oldest-*` by about 45 seconds. This confirms fixture ordering,
not a new scoring-policy diagnosis. Auth's isolated whole-suite repeat follows;
neither a later pass nor previous-head evidence waives this failed full run.

After complete failing JSON and zero owned schemas/active DB queries, only the
exact owned Jest PID was stopped for retained handles. That is not a successful
full-suite process exit. No dev data, history trigger or failing assertion changed.

Isolated entire Auth E2E repeat: **26 PASS**, zero skipped, normal exit in
28.354 seconds. This repeats the earlier head's intermittent registration-test
observation; it does not establish the timeout cause or waive full E2E failure.
GraphQL consistency again fails on the inherited generated barrel comment drift
(DEBT-044), with schema/operations unchanged. Final Web/workspace and generator
side-effect cleanup evidence follows below.

Fresh other workspace checks PASS: Editor 23, Storage 43, Worker 36, Web 59;
coverage is collected for Storage/Worker/Web. They run after API E2E and its
isolated Auth repeat, not concurrently with the measured API tests. Web smoke
repeats **10 PASS/3 FAIL** (Enter Station visibility, DEBT-034), in 38.0 seconds;
verification stops at that existing broken UI boundary without frontend changes.
The workspace unit and Web smoke jobs overlap each other with bounded workers.

Generated/Next dev side effects in Web `gql/index.ts` and `AGENTS.md` are inspected
and restored exactly. The generated barrel blob hash matches HEAD; canonical
schema, authored frontend, Prisma schema and lockfile have no diff. Changed-file
format/diff checks pass. Local ignored evidence is `node_modules/.cache/dss-debt-051-*`:
baseline/coverage/focused/full/isolated-auth JSON and command logs. This is an
implemented correction for draft review, not a green complete package. Full
baseline quality, independent review, CI and owner acceptance remain OPEN.
