# D4 — Owned transactional mention resolution

Date: 2026-10-15. Status: local runtime implemented; full quality/CI/acceptance open.
Branch `debt/d4-mentions-owned-transaction`, based on `0c20f03` / draft PR #18.
Parent drafts remain unaccepted; no red merge or Phase 11 readiness is claimed.
Authority: the owner's explicit one-SQL approval on 2026-10-15 and the
[approved operation-specific design](../development/D4_TRANSACTIONAL_MENTIONS_PLAN.md).

## Ownership and preserved behavior

Interactions retains its comment/target/revision/mention reconciliation and
audit/outbox algorithm in a guarded stateless writer. Its normal repository keeps
reads/list/revisions and delegates create/edit/tombstone through its own semantic
port. ORM clients and recipient callbacks never appear in business contracts.

Users defines the parameterized id/username candidate subquery and owns the
unchanged exact-first/unique en-US, accent-sensitive matcher. Auth defines only
ACTIVE opaque subject IDs and knows neither handles nor Users services. Root joins
these fixed projections in one bound SELECT at the former lookup point inside
the same default-isolation comment transaction, returning only recipient IDs to
the writer. This is not a generic SQL/transaction framework or ambient context.

The edit advisory lock, revision numbering, original-author notifications versus
transition-actor audit, same-row reactivation, retraction order, payloads and
tombstone mapping are preserved. Empty names skip selectors/query/matcher.
Application extraction still deduplicates case-insensitively before lookup;
different exact case variants in a direct technical input are not a promise that
application extraction retains both. An initial new test expectation was corrected
to use distinct handles, without altering extraction or production behavior.

Eligibility is checked at the existing SELECT point, not newly guaranteed at commit
time. Inactive exact candidates are excluded before ambiguity decisions. SQL ILIKE
retains its underscore wildcard candidate behavior; the literal owned matcher
rejects deceptive candidates. User inputs are bound, not SQL identifiers/fragments.
Queries use the existing connection search path (public in production; the owned
schema in these fixtures); no new multi-tenant schema capability is claimed.

No public API/GraphQL schema, Prisma schema/migration, dependency, UI, timeout,
isolation/retry policy, ACL, owner/moderator right, notification or scoring change.
DEBT-057 remains separate. No existing history trigger is weakened.

## Focused evidence

- **29 migrated E2E PASS**, zero skipped, normal exit (27.902 s): all 16 unchanged
  historical characterizations plus 13 runtime cases.
- One actual composed SELECT matches the old combined Prisma predicate/matcher on
  case/ambiguity/inactive/self/Unicode/underscore/order inputs; hostile strings stay
  bound. No second owner read, cross-request cache or result cap is introduced.
- Real independent status/rename commits verify lookup-time eligibility and reject
  the old-handle/new-ACTIVE false-positive design. The latter still permits the
  genuinely ACTIVE unique case-variant fallback, never the renamed subject.
- Profile/subject selector, matcher and real malformed-query failures occur after
  actual comment/revision inserts and roll back target/comment/revision/evidence.
- Four delegate faults call actual target/comment/revision/mention INSERTs before
  throwing, and verify identical persisted snapshots/counts after rollback. Prior
  characterizations separately cover real audit/outbox post-write failures,
  unchanged/retract/reactivate/tombstone lifecycle and concurrent revisions.
- **32 unit PASS** pin same-client callback binding/default options, all provider
  failures, owned SQL/matcher rules, write transitions, repository delegation and
  active/deleted mapper paths. These mocks do not certify authorization or rollback;
  migrated E2E supplies that evidence.
- AST comparison against `0c20f03` confirms unchanged `record`, `recordMention`,
  `parseDocument` and the reconciliation body after recipient selection.

Ignored evidence: `node_modules/.cache/dss-d4-mentions-runtime-*`. Parent gate
results are not current acceptance; full runtime results are recorded below.

## Full runtime gates

Full API coverage: **967 PASS**, 141 suites, zero skipped, normal exit (48.308 s),
all four Auth/recovery/IAM DB and Auth Redis opt-ins. All **21** scoped thresholds
pass; eight new thresholds protect the transferred paths and none of the prior
13 were lowered. All eight paths have 100% statements/functions/lines. Branches:
root write unit 75%, root resolver 78.57%, writer 87.5%, repository 83.33%; the
uncovered conditional branches are Nest DI metadata, not owned logic. Mapper,
matcher and both SQL selectors have 100% coverage (including no-branch files).

Root lint/typecheck, Prisma validation and production build PASS (fresh API and
five unchanged cached outputs). All **64** architecture fixtures PASS; frozen
inventory remains **89**, without baseline growth or waivers. Five additional
fixtures pin owned read/write delegates, root SQL/transaction surfaces and the
business port; exact technical export allowlists also cover Auth/Users/Interactions.

Fresh adjacent tests PASS: Editor **23**, Storage **43**, Worker **36**, Web **59**,
with existing coverage gates where configured. All **14** patch regressions PASS.
Changed-file format/diff checks pass. Global format remains red on **41** inherited
files; audit remains **1 high / 10 moderate**; generated GraphQL consistency remains
red on DEBT-044 barrel comment/newline drift. Its generated side effect was restored
to exact parent hash `af783993600932bfe5466bd5413fc8b4c85c021c`. No manual canonical
schema edit or authored frontend change is included.

Full E2E: **349 PASS / 1 FAIL**, 350 tests / 36 suites, zero skipped (242.285 s).
All 16 golden + 13 new mentions cases, all 26 Auth cases, Reputation read regressions
and adjacent suites pass. The failure is known DEBT-045 News foundation viewCount
null/zero expectation plus prohibited target cleanup. No timeout was raised, test
skipped or history protection disabled. DEBT-048 does not reproduce in this run;
that is not a claim that the separate debt is fixed.

Only the verified own tmpfs PostgreSQL project on loopback 5435 was recreated:
zero public tables before applying all 54 migrations, no seed. Dev 5433 and the
5434 unit/integration base were not reset. Complete Jest JSON was emitted, but
remaining handles prevented normal exit. Only verified owned PID 15668 was stopped
after checking zero active database work/owned schemas. This is not a successful
process exit or a full green gate.

No browser/dev server was started here. The unchanged broken Web entry is not
repeated beyond its established first failure; no current full browser success is
claimed. Parent PR #18 had both Storage OS checks green, Web/audit red and its main
job still live when read; parent state is not this package's CI acceptance.

## Remaining work

Reputation write-response joins, Users/IAM shared-row ownership, remaining
transaction-local subject checks, D4.4/D4.5, D5–D7, stack boundary audit and owner
acceptance remain open. The owner-authored untracked stack audit plan is untouched
and unstaged. Stop before Phase 11 for its mandatory brainstorm.
