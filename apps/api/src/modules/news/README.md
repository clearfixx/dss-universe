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
Packages 10.8–10.9 add public Full News delivery, catalog/UI contracts,
viewer-aware votes and bookmarks, and bounded voter statistics. Package 10.10
adds paginated Reddit-like comment trees, replies, per-comment rating,
low-score disclosure and tombstone-safe branch delivery. Package 10.11 binds
News attachments to DSS Media references and exposes safe file metadata,
SHA-256/SHA-1/MD5 digests and public original downloads. Package 10.12 adds
real unique views plus retry-safe total and per-channel sharing counters through
the canonical Interaction Target.

The pagination correction adds an audited policy for News and News comments,
parallel cursor and numbered delivery, chronological neighbors, and explicit
SEO links between published articles. Forum discussion links remain deferred
until Phase 13 owns a canonical Forum Topic identity.

Shared services retain their ownership: Editor validates documents, Media owns
files, and Interactions owns comments, reactions and bookmarks.
