# Phase 11 RL-0 — Research Lab foundation

Status: implementation package under review.

## Scope

RL-0 introduces the owner boundary and additive persistence foundation for the
single Research Lab Wiki/research product. It deliberately exposes no public
GraphQL or REST operations and performs no publication.

Included:

- page, draft, immutable revision and append-only review-decision schema;
- page kinds, lifecycle states, audience and protection vocabulary;
- categories, tags, technologies, manuals, collections, aliases and internal
  links;
- same-page foreign keys for published, base and rollback revisions;
- FK-backed canonical `InteractionTarget` identity;
- consumer-owned authorization evidence contract;
- closed page/revision state machines;
- additive migration guards and migrated-database regressions.

Deferred to later accepted packages:

- repositories, commands, GraphQL and generated Web contracts;
- Editor normalization and draft autosave;
- publication, rollback and delivery projections;
- Media reference activation;
- InteractionTarget policy registration;
- Search, SEO, Activity, Notifications and Gamification;
- frontend implementation.

## Invariants

- A page can become `ACTIVE` only with a published revision.
- Published/base/rollback revisions must belong to the same page.
- Revision numbers and draft versions are positive.
- Historical revision states are closed; rejected, withdrawn, superseded and
  changes-requested revisions are never reopened in place.
- Restoring content creates a later fact; it does not mutate history.
- Tombstones require actor, timestamp and non-empty reason.
- Audience group keys use IAM's canonical key grammar.
- Root category slugs remain unique despite PostgreSQL NULL semantics.
- Categories and internal links cannot point directly to themselves.
- Ordered memberships cannot use negative positions.
- Review decisions require policy and audit correlation evidence.

Arbitrary category cycles, alias collisions with current canonical routes and
multi-row ordering conflicts require transactional repository checks in RL-3;
the schema guards the single-row forms now without pretending to solve the
future command boundary.

## Verification

- Prisma format and validate;
- migration generated from the accepted disposable baseline;
- migration deployed only to `dss_test`;
- zero Prisma schema drift;
- lifecycle unit tests: 18/18;
- migrated Research Lab DB regressions: 4/4;
- complete API unit baseline: 1553 passed, 106 skipped by existing opt-in
  policy;
- API lint and typecheck;
- architecture and Editor license checks.

The final package still requires the repository full quality gate and GitHub CI
on the committed PR head.

🔭 A foundation should make future work boring in exactly the right places.
