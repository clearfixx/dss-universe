# Research Lab module

Research Lab owns the single DSS Universe Wiki and long-form research product.
`Knowledge Forge` is a historical product alias; the technical `WIKI` Editor
profile and Guardian capability remain compatible identifiers.

Research Lab exposes GraphQL operations for drafts, Guardian review, publication,
rollback, page delivery, revision history and comparison. Hiding a page requires
the Research Lab moderation permission. Tombstoned pages are inaccessible to all
viewers under the current owner model.

Guardians can configure each page's trusted edit groups through
`setResearchTrustedEditors`. Group keys control who can propose revisions on
that page. The audience policy still applies, and a Guardian reviews submissions.
An empty list reserves edits on the trusted page to Guardians.

Guardians can inspect the current mode and list with `researchEditPolicy` and switch modes with `setResearchEditProtection`. The list is preserved when a page is locked and applies again when its mode returns to `TRUSTED`.

Guardians use `researchReviewQueue` to list pending submissions and `researchPendingRevision` to read one. Both check the current page audience. Editor filters gated document blocks for the reviewer before delivery.

Authors can list their drafts through `researchOwnDrafts` and reopen a saved Wiki document through `researchOwnDraft`. The returned version is the expected version for the next save.

Editor validates Wiki documents and projects content for the viewer. IAM supplies
group and Guardian evidence. Research Lab supplies page access decisions to
Interactions and published results to shared Search. Each search reads published
pages in a single PostgreSQL snapshot so concurrent publication preserves
consistent results, totals and category counts within the request.

🧭 A Wiki without history is just a text box with excellent confidence.
