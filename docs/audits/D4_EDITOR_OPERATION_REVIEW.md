# D4 — Editor operations and projection boundaries

2026-10-19. Baseline `c21d80b6fef41c92826f566dc0a7631f0decafd5`, draft PR #43;
unaccepted stack, not release certification. No runtime/schema/UI changes.

## Scope and ownership

Read all 22 non-test TypeScript files in `apps/api/src/modules/editor/`: module,
index, six application services, four public contracts, two gate ports, two
application projection types, highlighter contract, two rendering adapters and
three GraphQL presentation files. Also read README, root single/scoped gate
adapters, shared validation/projections/profile definitions, service/delivery
specs; inspected remaining test titles. Shared capabilities/autosave and frontend
implementation are not exhaustively reviewed by this packet.

| Operation                                    | Actual responsibility and side effects                                                                                                                              | Remaining limits                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| normalize / normalizeNews / normalizeComment | JSON byte bound 1000000; shared schema/profile validation; canonical JSON and authored plain/search text; fixed NEWS/COMMENT at host normalizer boundary            | Validation is not viewer authorization; malformed nested shapes can escape as runtime errors (DEBT-066)                                  |
| preview                                      | normalize caller-supplied JSON, render authored content including gates, return canonical/HTML/plain/search text                                                    | JWT-protected GraphQL; does not fetch a saved document; caller-provided text returned is not evidence of a hidden stored-content leak    |
| viewer delivery                              | normalize, per-operation gate promise map, recursive reached-gate evaluation, denied node reduced to gate ID placeholder; safe document JSON and explicit decisions | Denied descendants not visited; all started sibling redactions settle before failure propagates; no raw fallback                         |
| narrow viewer projector                      | return documentJson only, drop gate verdicts                                                                                                                        | No expected profile fixed here; owning caller remains responsible for intended content context                                           |
| public search projection                     | NEWS-only normalize; shared traversal excludes all gate payloads and reports presence of gates                                                                      | No policy/provider lookup; not a member-visible search shortcut                                                                          |
| viewer search projection                     | NEWS-only delivery, then shared whole-document search normalization                                                                                                 | Returns allowed search text, not definitions/thresholds; no cross-viewer cache                                                           |
| batch viewer search                          | at most 64 documents, nonblank viewer; copy inputs, one explicit decision scope, chunks of four, preserve order; settle started work, close in finally              | Empty batch opens no scope; this bound is per batch, not a global result limit                                                           |
| root gate adapters                           | translate closed verdict fields/requirement kinds, scope evaluate/close forwarding                                                                                  | No account/profile/Prisma state enters Editor; ContentAccess evidence freshness requires its separate owner trace                        |
| HTML render / Shiki                          | escaped text/link values; fixed markup; UUID/note-ID attributes rely on prior validation; lazy cached Shiki import                                                  | Renderer accepts typed documents, not an independent untrusted-input validator; no file/storage URL resolution or Media existence lookup |
| GraphQL transport                            | authenticated preview/delivery; actor context used for delivery viewer; explicit result fields                                                                      | Presentation imports Prisma ContentGateRequirementKind enum: remaining D4.4 ORM-representation coupling, not a DB read                   |

No DB, Audit, Outbox or queue operation occurs in these fully read Editor module
sources. Media/mention/gate IDs are references, not authority to read their
aggregates. Existence, Media delivery and owner publication policy remain outside
this module. Public index uses named exports and Nest exports only four
projection/normalizer tokens, not concrete application services. Root-owned gate
ports are published explicitly rather than direct ContentAccess service imports.

## Confirmed validation defect: DEBT-066

Synthetic inputs through actual EditorService.normalize produce:

- null child, 81 bytes: TypeError reading type;
- object instead of content array, 87 bytes: TypeError, not iterable;
- object instead of marks array, 165 bytes: TypeError calling entries;
- valid doc root followed by 12000 nested blockquotes, 408108 bytes: RangeError,
  maximum call stack size exceeded, before controlled NODE_LIMIT rejection.

First three were reproduced through current API source using ts-node and through
the existing production build; depth case through the existing build. Shared
validator source explains the paths: the second document-grade traversal assumes
well-shaped children even after first-pass errors; marks is iterated before an
array guard; recursive traversal has no depth guard and checks aggregate node
limit only afterward. An initial depth probe with an invalid blockquote root was
correctly rejected with 400; only the corrected doc-root probe proves the depth
failure. No network/DB or real user data involved.

These are service-boundary failures, not live HTTP evidence or proof of whole
process crash, unauthorized content disclosure or arbitrary execution. Separate
fix approval requested; no behavior change here. Agree an explicit depth policy,
then validate malformed nested structures safely and test shared/API/HTTP paths.

## Verification and acceptance

Existing Editor API tests rerun: **37/37 PASS, seven suites, normal exit 0**.
They do not contradict the untested malformed/depth diagnostics. This packet
adds no diagnostic test that would falsely present these errors as fixed.
Earlier Content Boundaries E2E covers delivery; app registration test also embeds
preview assertions but its recurring 5000ms timeout prevents treating it as fresh
independent preview certification. No live E2E or full gate rerun for this
documentation-only review; parent PR #42 evidence and known red gates remain.

Markdown format/diff checks required for delivery. D4 owner reconciliation,
producer lifecycle/privacy traces, D4.4/D4.5, D5–D7, requested stack audit and
Phase 11 brainstorm remain open. No debt closure or full D4 acceptance claimed.
