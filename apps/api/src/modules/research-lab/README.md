# Research Lab module

Research Lab owns the single DSS Universe Wiki and long-form research product.
`Knowledge Forge` is a historical product alias; the technical `WIKI` Editor
profile and Guardian capability remain compatible identifiers.

Research Lab exposes GraphQL operations for drafts, Guardian review, publication,
rollback, page delivery, revision history and comparison. Hiding a page requires
the Research Lab moderation permission. Tombstoned pages are inaccessible to all
viewers under the current owner model.

Editor validates Wiki documents and projects content for the viewer. IAM supplies
group and Guardian evidence. Research Lab supplies page access decisions to
Interactions and published results to shared Search. Each search reads published
pages in a single PostgreSQL snapshot so concurrent publication preserves
consistent results, totals and category counts within the request.

🧭 A Wiki without history is just a text box with excellent confidence.
