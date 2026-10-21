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
port. Ranking-prefix fingerprints and bind order remain pinned to the original
query. DEBT-060 deliberately changes the final page selection; the complete new
statement has separately reviewed fingerprints and migrated regression tests.

DEBT-060 now returns an independent population total with ranking rows in one
facts result. Leaderboards owns a population-preserving LEFT JOIN page fragment:
it reads the existing ranked window total (or zero when the population is empty).
An empty requested page cannot erase that total. Root strips the technical null
page row, never fabricates a card, and rejects a missing population result rather
than silently returning zero. No independent count query or new transaction.
Existing service exports await D4.4 review; this folder does
not imply D4 acceptance or authorization to implement Phase 11.
