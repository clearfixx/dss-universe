# News Platform Passport

News owns moderated articles, immutable revisions, editorial lifecycle and
publication policy. It exposes one article through Short and Full projections;
it does not duplicate those forms as separate content records.

Package 10.1 delivers the canonical draft aggregate, initial revision,
Interaction Target ownership, Audit and Outbox evidence.

Packages 10.2–10.3 add hierarchical categories, tags, scoped typed-field
definitions and News-owned optimistic draft saves. Every successful save
advances the article version and appends an immutable revision; stale sessions
receive a conflict rather than overwriting newer work.

Packages 10.4–10.7 add post-template validation, permission-owned editorial
transitions, scheduled publication and the canonical Short News delivery
projection. Scheduled material stays private until server activation; public
queries use stable cursors and compose engagement from Interaction Platform.
Full News delivery and UI remain in their scheduled Phase 10 packages.

Shared services retain their ownership: Editor validates documents, Media owns
files, and Interactions owns comments, reactions and bookmarks.
