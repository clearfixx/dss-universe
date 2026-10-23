# DEBT-057 — News tombstone transport compatibility

Status: exact contract approved; implementation and focused regressions verified;
full quality/CI and acceptance remain open.
Base: accepted main `f118d82`. Branch: `debt/debt-057-tombstone-contract`.
Owner approved a separate compatibility-first package, then HTTP-backed correction.
Owner confirmed the exact nullable contract below before runtime implementation.

## Evidence and ownership

NewsCommentItem already permits null body/documentJson. Shared Comment GraphQL
already declares both nullable. Interactions owns deletion: its writer clears
current body/document/searchText and records deletion actor/time/reason; immutable
revisions and audit remain separate. News composition forwards this projection,
author and children inside the existing response snapshot.

Only NewsComment GraphQL incorrectly declares body/documentJson as non-null
strings. D7's actual-SDL synthetic execution demonstrated null bubbling breaks
the page. Generated Web NewsCommentFieldsFragment and nested query currently
assume strings, so source annotations alone are not sufficient correction.

## Approved exact output contract

| Field / behavior                             | Contract                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| NewsComment.body                             | String nullable; null for existing tombstone projection.                     |
| NewsComment.documentJson                     | String nullable; null for tombstones and already-supported absent documents. |
| isDeleted                                    | Existing non-null boolean; no new deletion state.                            |
| id/reactionTargetId/parent/author/timestamps | Existing fields and exposure unchanged.                                      |
| children/page totals/order                   | Preserve nodes and live descendants; no filtering to hide a transport error. |
| Revision/audit access                        | Existing authorization and immutable history unchanged.                      |

No fabricated empty string or placeholder document substitutes for null. No DB
migration, writer/history rewrite, owner bypass or new moderation power. Future
owner visibility remains in its approved phase, not implemented by this fix.

## Web/generated compatibility

Regenerate SDL/client through committed tooling; never hand-edit generated
outputs. Expected semantic SDL delta is exactly the two NewsComment nullability
changes. Generated fragment/nested-query fields become string-or-null without
renaming operations or changing selections.

Existing news-comments.tsx branches on isDeleted before rendering body, displays
its existing deletion label and does not consume documentJson. React accepts a
nullable text child; this inspection is not a substitute for regeneration,
typecheck or component regression. Preserve current UI/styles, child expansion,
pagination and disabled tombstone actions. No frontend redesign.

Output nullability loosening is a generated-client source-contract change, not
silently advertised as universally backward compatible. Regenerate/review all
repository clients together; do not claim unknown external clients are safe.

## Required regressions and gates

- Actual GraphQL HTTP returns tombstone nulls without errors and retains a live
  sibling/reply, exact identity/order and pagination totals.
- Synthetic deleted text never appears in the response; live content still does.
- Existing guest/member article eligibility is unchanged and denies inaccessible
  projections. No direct service test substitutes for HTTP null propagation.
- Persisted immutable revisions/deletion attribution remain unchanged by reads;
  existing write/audit regressions remain mandatory.
- Generated Web fragment/query typecheck and component test with a deleted parent
  plus live child; no JSON parse of null or invented API text.
- Full quality/security/CI, current SDL diff review and owner acceptance. Current
  Next dependency blockers are not waived; no red merge or Phase11 entry.

## Implementation evidence

The News GraphQL model now declares only body/documentJson nullable. Generated
SDL has exactly those two semantic changes; committed codegen regenerated the
Web fragment and nested query nullability. No component UI implementation changed.

HTTP regression also exposed JSON.stringify(null) in the Interactions delivery
mapper. The mapper now preserves database null as null rather than the string
"null"; its query, ordering, transaction and access policies remain unchanged.

Three real migrated-schema HTTP regressions failed before correction with GraphQL
non-null errors and pass after correction: guest/member tree and page retention,
and MEMBERS audience denial. Reads preserve original revisions, deletion actor,
reason and audit evidence. A generated-type Web component regression passes with
a deleted null parent and live reply; only the live reply has reply/vote controls.
Web/API typechecks pass; all Web tests pass (61/61). Four related HTTP suites
pass (71/71), covering tombstones, secondary audience, interaction audience and
owned response snapshots. Architecture checks pass (140/140; zero baseline
findings, not a universal compliance certificate). Strict changed-source lint
passes after applying the API package's formatter configuration. Production
build passes (six tasks, four cached; API and Web rebuilt).

Related HTTP evidence: `node_modules/.cache/debt057-related-http.json` (ignored).
These results are not full release acceptance; full gates, security blockers
and CI must be reported separately.

Full-gate attempt (`%TEMP%/dss-debt057-quality-full.log`) passed format,
architecture, Prisma validation/generation, empty schema drift, lint, typecheck
and mandatory runner-policy checks, then stopped at security:check (exit 1).
Blockers remain GHSA-2464-fhr4-w9xw (critical), GHSA-p3m5-59mp-jv5r (high),
GHSA-673q-mjm6-r5xr (critical). The existing exact braces exception was verified
with 14 passing regressions; no exception was added. Later full-gate coverage,
E2E/build/smoke steps did not execute in that attempt; independent build and
focused regressions above are not a substitute for those missing gates.

Initial CI at ccc8f9c: API units1298/1298; E2E595/596. The sole failure was the
old pre-transfer characterization explicitly expecting the now-corrected GraphQL
non-null error. Its assertion is updated to require an intact page, exact null
body/document, deleted flag and retained non-disclosure assertion. Both tombstone
HTTP suites then pass locally9/9. This is approved behavior correction, not removal
of a privacy assertion. Latest-head CI still needs verification.

Initial CI containment passed both OS. Web job was green but its actual logs show
one flaky/13 passed after retries, not a clean14/14 first attempt. D7 separately
records DEBT-080 for reproduction and strict CI acceptance policy alignment;
this package does not change UI, Playwright retries, assertions or timeouts.
