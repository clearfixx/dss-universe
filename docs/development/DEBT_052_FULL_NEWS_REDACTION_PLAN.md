# DEBT-052 — Full News viewer-safe document delivery

Date: 2026-10-14. Status: implementation in place; local verification/review acceptance OPEN.
Priority: Critical; release and Phase 11 blocker until verified correction.

## Authority and package order

The owner approved a separate priority security package covering server-side
Full News redaction through narrow contracts, guest/GROUP/Premium/author/provider
failure cases and related projection regressions. The separately approved
DEBT-051 canonical attachment correction follows it; do not bundle that behavior
change into this package. Subsequently the owner approved separate DEBT-053
search and DEBT-054 related-audience security packages, in that order after
DEBT-052. DEBT-051 remains separate after the priority security corrections.
No new owner/Command Deck rights or frontend work.

Preserve the reviewed D4.3d3a ownership increment in its own commit and PR #10
before opening `debt/debt-052-full-news-redaction` from that exact published head.
Use a separate stacked draft PR with `debt/d4-module-boundaries` as its base;
neither parent PR #10 nor its parent PR #9 is accepted. No red merge.

An initial Git write request did not execute because automatic approval review
hit its usage limit. A subsequent account check allowed ordinary work; the same
escalated approval route then succeeded without a bypass. D4.3d3a is committed
and pushed as `5851381` in PR #10; the separate correction branch is now active.
This design does not itself close debt; runtime verification is recorded below.

## Evidence and boundaries

The migrated AppModule test in `news-attachment-contracts.e2e-spec.ts` creates
a PUBLIC canonical News article with a real COMMENTS=100 gate and synthetic text.
Guest Editor delivery removes that text; public Full News returns it. The raw
`documentJson` originates in `PrismaNewsDeliveryRepository.findFullBySlug` and
passes unchanged through `NewsDeliveryService.fullProjection` to GraphQL.

`EditorContentDeliveryService.project` already validates the canonical document,
evaluates gates through an Editor-owned port, deduplicates decisions within one
request and removes denied payloads recursively. Provider errors propagate.
At the package base it was private: EditorModule exported only normalization.
Do not expose that concrete service or copy its redaction algorithm into News.

## Planned dependency and response flow

1. Editor publishes a named viewer-safe projection token/interface in `contracts/`.
   Input: canonical document JSON and opaque viewer ID or null. Output: only
   viewer-safe document JSON needed by this consumer, not a gate aggregate,
   credentials, profile, Prisma row or transaction. Bind to an Editor-owned
   adapter over the existing redaction service; keep concrete services private.
2. News defines its own narrow document-delivery port. Root Content composition
   maps it to the published Editor contract, using explicit imports/exports and
   field selection. Existing ContentAccess decision composition remains the
   only policy source; no News dependency on IAM/Auth/ContentAccess internals.
3. News application first reads the eligible article. Null short-circuits all
   document/attachment providers. Then project its document for this request's
   viewer; only that safe JSON may become the response's `documentJson` or input
   to attachment projection. Never retain the raw value through a final spread.
4. Preserve synchronous invalid-address validation, unchanged GraphQL fields,
   existing visibility filtering and independent metadata-read ordering. A
   denied gate produces the existing safe placeholder shape; a projection or
   decision-provider failure fails the full response, never raw-content fallback.

No process-global viewer cache. No database read transaction is split or new
snapshot guarantee invented. Stored authored documents remain intact. Invalid
stored documents fail closed; legacy doc-node test fixtures must not motivate
raw JSON fallback or bypassing canonical validation. Real public/create/read
security fixtures use canonical NEWS documents.

## Policy regression matrix

| Case                                      | Required evidence                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Guest, unmet numeric gate                 | Protected text, labels and media IDs absent from actual Full News response |
| Ordinary member, unmet/met threshold      | Denial/allow matches current ContentAccess decision                        |
| GROUP mismatch, including Premium/author  | Mandatory group constraint is not bypassed                                 |
| GROUP match plus numeric gate             | Numeric condition still applies to ordinary members                        |
| Premium in allowed audience               | Numeric bypass preserved without staff privileges                          |
| Author                                    | Existing author bypass only where the current decision contract permits    |
| Membership/Premium revoked or expired     | Subsequent request observes current eligibility; no cross-viewer reuse     |
| Nested/repeated gates                     | Recursive pruning and request-local decision deduplication preserved       |
| Missing article/wrong audience            | No document or metadata provider invocation                                |
| Editor/decision/metadata provider failure | Rejected service call and GraphQL error/null, no partial/raw success       |
| Public ordinary document                  | Content, metadata and response shape retained; no accidental denial        |

Use real migrated AppModule, root bindings, authenticated sessions and disposable
DB/Redis for policy cases. Pure typed tests separately pin mapping, ordering and
error propagation. A private Editor test alone cannot prove public integration.
Flip the vulnerable-baseline characterization to require protected-text absence;
passing the old disclosure expectation is not correction acceptance.

## Adjacent-channel review required before acceptance

Source inspection confirms these paths exist, not that all are exploitable:

- NewsService stores `projection.searchText`; Editor's generic text projection
  descends into contentGate children. Public News filtering includes that stored
  field. Reproduce hidden-marker search with real responses, counts, pins and
  pagination; distinguish a search-match oracle from returning hidden text.
- Full News also serializes templateData and maps related article summaries.
  Template normalization allowlists post-specific fields, but this alone is not
  proof of gate/audience safety for media URLs or linked article metadata.
- News comment responses serialize stored comment documents/body. Validate the
  COMMENT profile's gate prohibition and supported write paths before asserting
  no gated payload can reach them.
- Review public Media reference/delivery and Editor preview callers separately:
  a safe attachment manifest is not proof that direct binary URLs are authorized.

Record current behavior and focused regression evidence for each channel. Any
new defect needs a debt entry and owner notification; expand implementation only
within the approved package or after explicit scope approval. Do not declare
the whole platform secure from correcting Full News alone.

## Verification and completion

Follow the full workflow matrix: changed/global format, Passports, architecture
and dependency licenses, Prisma validation/client/migration status, lint, types,
full opt-in units and coverage, relevant and full API/Web E2E, generated GraphQL,
production build, security audit/patch regressions, CI and review. Run heavyweight
gates serially or with bounded workers; record cache hits and every known red gate.
No schema or migration is expected for this correction.

Report actual commands/results and source coverage, not just test counts. Debt
status remains OPEN until the approved response paths and policy matrix have
direct evidence. Existing unrelated red checks remain visible; no waiver, silent
skip, widened architecture baseline or disabled lint rule. Publish a separate
commit/push/attached draft PR; do not merge red checks or start Phase 11.

After DEBT-052, implement DEBT-051 separately with canonical wrapper traversal,
contentGate subtree exclusion, original order/deduplication and unchanged
READY/PUBLIC/active-reference rules. Then resume remaining D4 ownership work,
D5–D7 and the mandatory pre-Phase-11 brainstorm.

## Implementation checkpoint

The named `EDITOR_VIEWER_DOCUMENT_PROJECTOR` returns only safe document JSON
through a private Editor adapter. `NEWS_VIEWER_DOCUMENT_READER` is bound at root
Content composition, with field selection and error propagation. Full News
replaces the raw stored JSON after eligibility and before attachment projection;
the existing ContentAccess policy remains the only decision source. No schema,
migration, dependency or frontend behavior is changed.

Pure tests pass (21 across three focused suites); twenty new migrated E2E cases
pass (eighteen security/compatibility and two explicit adjacent disclosure
characterizations). Real GROUP fixtures use `group:<key>`; an initial fixture using
bare custom-group keys correctly denied access and was corrected, not the policy.
Root lint/types, full 800 API opt-in units, scoped coverage and production build
pass. All 45 focused E2E pass. Full API E2E remains RED on the known DEBT-045,
and Web smoke remains RED on DEBT-034; no baseline waiver. See the
[corrective evidence report](../audits/DEBT_052_FULL_NEWS_REDACTION.md).
A combined attachment regression run initially exposed a JSON object-key ordering
assertion; compare parsed
documents, since PostgreSQL JSONB does not preserve authored property order.

Legacy doc-node attachment fixtures now exercise the owned attachment component
directly, never malformed documents stored for public Full News. Their metadata,
eligibility and failure checks remain; canonical API manifest omission stays
DEBT-051, and public denied-text expectations now require redaction. This does
not claim Full News metadata transport is repaired before that separate package.

Adjacent review confirms DEBT-053: guest News search matches denied gate text and
returns article/count, though the corrected Full News no longer returns the text.
The owner approved its separate security package after DEBT-052 on 2026-10-14;
implementation has not started and it is not silently fixed here.
Adjacent related-summary review also confirms DEBT-054: a guest cannot read a
MEMBERS-only article, but its synthetic headline/slug appear in the related block
of a PUBLIC source linked through the existing authorized NewsLinksService.
The owner approved a separate correction after DEBT-053; not implemented here.
COMMENT/NEWS gate documents are rejected on the supported CommentsService write
path before persistence, while an ordinary comment succeeds and is read through
News delivery. This does not certify arbitrary legacy/tampered stored comments.

The positive disclosure characterizations are not acceptance. Full package/CI/review
remain OPEN; no claim that the whole platform is safe.

Docker Desktop was stopped at the start of runtime verification. It was started
without reset/reinstallation; existing dev services remained healthy. Separate
`dss-universe-test` PostgreSQL/Redis were started on loopback 5434/6380. Initial
sandbox EACCES and pre-start ECONNREFUSED did not execute policy assertions; the
subsequent migrated E2E run used actual healthy services. No dev/production writes.
