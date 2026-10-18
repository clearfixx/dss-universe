# Leaderboard read composition

This root infrastructure adapter preserves a single parameterized PostgreSQL
statement across independently owned data. It implements the Leaderboards-owned
ranking-facts input; features do not import one another's persistence.

Auth contributes the physical subject source, opaque ID, account age and ACTIVE
predicate. Users contributes only public profile columns. Community Points and
Reputation own signed aggregates and inclusive time predicates. Levels owns the
threshold lookup; Custom Titles owns selected/unrevoked/active title joins.
Leaderboards owns rank ordering, page bounds, viewer interpretation and card
mapping. Root assembles fixed fragments and normalizes numeric representations.

Technical `infrastructure.ts` entries are guarded by AST rules. Do not re-export
them from public business roots, accept raw user SQL/identifiers, introduce a
generic query framework or add independent reads, transactions or caches here.
No credentials, account state, raw ORM rows or all-time balance cross the facts
port. SQL aliases and bind order are pinned by the original two fingerprints and
fourteen isolated migrated tests.

The legacy empty-page/no-viewer total behavior is deliberately unchanged by this
ownership transfer. DEBT-060 is an approved separate correction, not hidden work
inside this package. Existing service exports await D4.4 review; this folder does
not imply D4 acceptance or authorization to implement Phase 11.
