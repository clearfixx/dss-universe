# Shared Search for DSS Universe

## First release

Use PostgreSQL and News as the first source. Search owns the public query,
pagination and result fields. News owns eligibility and the projection of
article content for the current viewer. Research Lab can supply a second
source when its publication and protected-page contracts are accepted.

News currently trims input, limits it to 100 characters and uses case-insensitive
substring patterns for title, short text and projected body. Preserve the
existing News endpoint, including its handling of SQL pattern characters.
For the new shared endpoint define plain-text input explicitly. Test percent,
underscore, backslash, Cyrillic text, short queries and cross-block matches.

## Results and access

Resolve the viewer from the authenticated request. For each eligible published
article use the current News projection. For authenticated viewers the existing
Editor and Content Access batch path evaluates gated documents in groups of 64.
A missing or stale projection currently fails the query and requires maintenance.
Preserve this behavior during rollout.

Build hits, counts, facets and pagination from one authorized match set in the
same database snapshot. Return a plain-text excerpt drawn from text visible to
that viewer. A title-only match may use the visible short description. Preserve
stable publication-time and ID ordering. An empty page beyond the last hit
still reports the total. The existing News feed separates pins and excludes
them from its numbered total. Shared search returns each matching article
once and includes pinned articles in its total.

## Engine decision

PostgreSQL already hosts the authoritative eligibility facts and projection.
Measure the current query with representative public and gated corpora before
adding an index. PostgreSQL 17 supports substring ILIKE with pg_trgm GIN or
GiST indexes. Short search terms with no usable trigrams can still scan the
index. Include them in timing and query-plan comparisons.
[PostgreSQL pg_trgm](https://www.postgresql.org/docs/17/pgtrgm.html)

Elasticsearch remains a candidate when measured latency or relevance needs
justify maintaining another service. An implementation would need document
versioning, replay, refresh monitoring, snapshot recovery and reconciliation
for late updates. Deep pagination requires a stable tie-breaker and a
point-in-time search with search_after. Viewer eligibility must still be
checked before calculating counts or returning snippets. A delayed index
refresh must never extend a revoked grant. The default Elasticsearch
distribution uses ELv2; Elastic also offers AGPLv3 for qualifying source.
[Elastic pagination](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results)
[Elastic licensing](https://www.elastic.co/pricing/faq/licensing)

## Implementation and acceptance

1. Add a named News search capability in root composition and a shared query.
   Return source, stable ID, title, language, slug, excerpt and publication
   time. Use the source discriminator and ID for hit identity.
2. Derive source and category counts from distinct matching IDs before
   pagination. Exercise guest, member, author, expired grant, revoked grant,
   hidden article, near-empty page, and a term found only in a gated block.
3. Keep News projection repair with its owner. Exercise a stale revision,
   concurrent edits during backfill and an interrupted rerun. Only current
   source and projection versions may satisfy a query.
4. Compare query plans, timings and result parity on the same fixtures, then
   publish the GraphQL schema and generated client contract for the frontend.
   Record corpus size, gated share, page depth and viewer group with timings.
