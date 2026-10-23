# DEBT-057 — News tombstone transport compatibility

Status: proposed exact contract; implementation not started.
Base: accepted main `f118d82`. Branch: `debt/debt-057-tombstone-contract`.
Owner approved a separate compatibility-first package, then HTTP-backed correction.
This document requests confirmation of the exact contract below.

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

## Proposed exact output contract

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

No runtime, SDL, generated client or UI file is changed by this design checkpoint.
