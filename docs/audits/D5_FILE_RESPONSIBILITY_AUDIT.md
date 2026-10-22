# D5 — File responsibility audit (local verification complete; review/CI open)

Date: 2026-10-21. Baseline main851c93a, merged integration PR#74.
Branch: `debt/d5-file-responsibilities`, separate managed worktree. Primary main
remains available for owner testing. Initial inventory was documentation-only;
the bounded implementation checkpoint below is not full D5 acceptance.

## Agreed boundaries and approach

File Passport correction, migration, classification and checker work is entirely
excluded and deferred to the owner's future GPT-5.6 task. This audit reviews
actual executable responsibilities, not headers, file length or stylistic taste.
Use existing architecture and sibling file conventions. Split only confirmed
unrelated roles; preserve public APIs, GraphQL SDL, metadata, DI lifecycle,
permission checks, guest/auth semantics and transaction boundaries. No UI work.

Sequence: inventory candidates; read their actual source and sibling patterns;
characterize relevant behavior; make bounded role separations on this one phase
branch; verify lint/types/architecture/unit/DB/E2E/GraphQL/build; publish review
evidence. Do not declare D5 complete from an AST scan or open a PR per file.

## Static inventory, not semantic certification

TypeScript AST scans840 tracked API/Worker runtime sources, excluding tests and
declarations. Twelve candidates combine class decorator roles within one file:

- core/cache/redis.module.ts: lifecycle Injectable and Module;
- core/graphql/resolvers/system.resolver.ts: DTO and Resolver;
- ai-core/presentation/graphql/editor-ai.graphql.ts: DTO and Resolver;
- auth email-verification/password-recovery/two-factor resolvers: DTO and Resolver;
- interactions audience-engagement resolver: Injectable, DTO and Resolver;
- news news-delivery.graphql.ts: Injectable, DTO and Resolver;
- news news-editorial/news-pins/news-settings.graphql.ts: DTO and Resolver;
- users users.resolver.ts: Injectable and Resolver.

Paths above are relative to apps/api/src (feature names relative to modules/).
This detector cannot establish that the other828 files have one responsibility.
It does not inspect every function/helper, SQL mapping or side effect. All twelve
need source-level disposition; absence of a match is not architectural acceptance.

## First actual source reads

`core/cache/redis.module.ts` defines RedisLifecycleService and wires RedisModule.
The service connects the lazy Redis connection on init and quits on shutdown;
the module constructs/provides the connection and exports only REDIS_CONNECTION.
Proposed separation: private lifecycle service file; same provider wiring and
same public module surface. No timeout, retry or connection policy changes.

`modules/interactions/presentation/graphql/resolvers/audience-engagement.resolver.ts`
defines a share wire-enum, optional JWT guard, two inputs, two output models and
the resolver. `bookmarks.resolver.ts` already uses separate inputs/models in the
same feature. Proposed separation follows those existing directories and keeps
the exact enum/type names and optional-auth behavior. Do not replace or broaden
the guard policy during a file move; current News viewer security must remain.

`docs/architecture/coding-style.md` confirms one clear responsibility per file
and relative internal imports. These two actual reads confirm candidate roles,
not a new security finding or a completed remediation. Remaining candidates and
broader semantic review are pending. No File Passport cleanup is authorized.

## Bounded implementation checkpoint — 2026-10-22

Redis lifecycle now lives in a feature-private service file. RedisModule still
provides the same connection and exports only REDIS_CONNECTION. Engagement wire
enum, input classes, output projections and optional JWT guard now live in their
corresponding presentation files; resolver methods and module wiring are unchanged.
Named imports are used; no public barrel, schema, migration or dependency changes
are part of this move.

Verified: 13 focused lifecycle/guard tests, scoped ESLint, API typecheck,
Prisma validation and architecture checks (140 tests, zero baseline findings).
The fresh worktree required Prisma generation with an explicit test URL and
workspace dependency builds before typecheck; the initial missing-artifact
failure was not treated as passing evidence. No database migration was run.

Also passed: 31 HTTP News engagement security regressions in a private migrated
schema on disposable port5435, API build, and regenerated SDL comparison. The SDL
remains byte-identical (SHA256
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`).
No generated GraphQL changes were accepted. Full phase gates and the remaining
source reviews remain open; these two separations do not complete D5.

## Security transport separation — 2026-10-22

Source review confirmed that SystemResolver mixed its API status model with query
handling, and the email verification, password recovery and two-factor resolvers
mixed inputs/result models with operation delegation. The extracted classes now
live in existing Core GraphQL types and Auth inputs/models directories. No public
barrel or cross-module capability was added. Repository-wide reference checks
found no source consumers of the former resolver-local input exports.

Names, field metadata, validation decorators, guards and service calls remain
unchanged. Eleven new focused input-validation cases pass, as do the 27 existing
AppModule HTTP scenarios, API lint/typecheck/build and all 140 architecture tests.
Regenerated SDL retains the same SHA256 recorded above. Full API unit/DB/Redis
verification passed naturally: 166 suites, 1249 tests, no skipped tests, 80.27s.
The logged IAM uniqueness errors belong to exercised negative scenarios, not
failed suites. Full D5 acceptance remains open.

Next candidates include AI editor transport and News delivery/editorial/settings/
pins, where shared wire enums must not keep DTOs dependent on resolver files.
Users also contains a local optional JWT guard. These are source-review leads,
not approval to alter authorization or a claim that their entire files have been
semantically audited. Six of the original twelve candidates have bounded moves;
that count is not a completion percentage for the broader responsibility audit.

## News settings and pins transport — 2026-10-22

Settings and pins resolvers now import feature-local input and output classes.
Pagination mode and pin scope wire enums have their own model files; pin DTOs no
longer import a delivery resolver to obtain the enum. Delivery uses that same
enum identity. Registration names/values, field metadata, guards, permission
checks and service calls are unchanged. No compatibility barrel or broader
public feature export was introduced; reference checks found only local uses.

The scoped unit run passed 28 tests across input validation, settings/pins service
policies and the editorial resolver. Migrated News foundation and engagement
audience suites passed 32 tests. SDL is byte-identical to the hash above. These
HTTP suites verify application wiring and existing audience behavior; they do not
claim direct HTTP coverage of every settings/pin mutation. API typecheck, lint
and architecture checks passed. API build and the full API unit/DB/Redis run
also passed naturally: 167 suites, 1262 tests, no skipped tests, 65.659s.

Eight initial candidates now have bounded separations. News delivery remains a
mixed-role candidate beyond the pin enum extraction; editorial, Users guard and
AI editor transport remain pending. Full phase acceptance is still open.

## News delivery and editorial transport — 2026-10-22

Delivery and editorial now keep only their existing resolver implementations.
Optional News JWT handling lives in its own guard; inputs, structural output
models and wire-enum registration live in feature-local presentation files.
Editorial DTOs and its unit test no longer import the delivery resolver for enums.
NewsModule retains the same guard provider identity through a named import of
its new location. No cross-owner contract, public barrel, database or policy
change is introduced.

An ad hoc TypeScript declaration comparison against the preceding Git checkpoint
confirmed 37 moved class/enum declarations and both resolver implementations
unchanged after ignoring whitespace and added named-export modifiers. The first
comparison attempt used an unavailable root TypeScript dependency; the corrected
check used API's own dependency. The comparison also had to normalize exports
after decorators; neither diagnostic required a runtime source correction.

Passed: 23 focused tests, seven migrated E2E suites (120 tests), API typecheck,
lint/build and 140 architecture tests. Regenerated SDL remains byte-identical to
the recorded canonical hash. Full API unit/DB/Redis run passed naturally:
168 suites, 1266 tests, no skipped tests, 54.221s.
The E2E selection exercises audience, redaction, related items, attachments,
secondary projections and delivery composition; it is not a replacement for the
whole phase E2E gate.

Ten original candidates now have bounded separations. Users optional guard and
AI editor transport remain, along with broader semantic review and full phase
acceptance. File Passport work remains excluded.

## Users and AI editor transport — 2026-10-22

Users optional JWT extraction now lives in a private feature-local guard. AI
editor input validation, result projection and wire-enum registration are split
from the resolver. The enum remains the same domain object, registered through
one presentation file; this is not a new AI integration or external call.
Consent validation, permission metadata and service delegation are unchanged.

Passed: 18 focused guard/input/public-boundary tests, two migrated E2E suites
(32 tests), API typecheck/lint/build and 140 architecture tests. AppModule wiring
and Users social privacy have HTTP evidence; no direct AI inference HTTP coverage
is claimed. SDL retains the canonical hash above. The full workspace `quality`
command exited0, including production build and all 140 architecture checks.
Its Turbo API task skipped106 opt-in tests; this gap is DEBT-073, not accepted
integration coverage. A separate direct uncached API coverage run with all four
DB/Redis opt-ins passed1281/1281 in170 suites, zero skipped,106.27s, natural exit0.
Web browser smoke passed13/13 without retries in38s; it verifies the local
Next.js render/interaction flow, not live browser-to-DB authentication. The
Verification skill kept these evidence boundaries explicit. Security policy
tests, exact approved braces patch regressions and GraphQL consistency passed.
Separate uncached Web coverage also passed60/60 in26 suites, natural exit0,
23.00s, with no reported unhandled errors. Aggregate API coverage is72.1%
statements/66.37% branches/43.65% functions/71.3% lines; configured thresholds
passed. Web coverage is72.98% statements/59.74% branches/76.52% functions/75.49%
lines. These totals are not a claim of exhaustive behavioral coverage.

The repeated filesystem AST inventory covers 870 API/Worker runtime files and
finds zero mixed decorator-role candidates. All twelve original candidates now
have bounded separations. This detector is still not a semantic compliance proof.
A second AST query found175 GraphQL DTO classes with no methods, accessors or
constructors. It checks structural DTO purity, not every possible initializer or
cross-owner data-flow risk.

### Additional source-level dispositions

- Worker main.ts was read in full: connection factories, processor wiring,
  heartbeat and shutdown belong to its composition-root role. No speculative
  split or policy change is justified by its length alone.
- Worker environment.ts was read in full: database/mail URL and port validation
  form one startup configuration responsibility; no queue processing or secrets
  logging is introduced there.
- EditorAiService was read in full: command validation, consent, prompt/provider
  orchestration and result labeling implement one AI editor use case. Its provider
  remains behind a port; moving consent out of the use case would weaken the
  existing application boundary, so no split is proposed.

At this intermediate checkpoint full API E2E was running on a freshly recreated
disposable5435 database after all54 migrations. Its final evidence is below.
Zero decorator candidates is not a reason to skip acceptance requirements or
mark the pre-Phase11 goal done.

### Full-run report-output failure retained

The first full E2E run reports53 passed suites /586 passed assertions in476.669s,
but exits1: the operator did not create the ignored node_modules/.cache report
directory, and Jest's final JSON write fails ENOENT. This is not a passing full
command and is not hidden. Its original log is retained separately. After the
exact missing-directory cause was established, that directory was explicitly
created and the full command was restarted on a freshly recreated disposable5435
database. No source assertion, timeout, runtime behavior or generated SDL was
changed to obtain a green retry. The corrected run completed naturally with exit0
in440.009s. Its JSON reports success:true,53 passed suites,586 passed tests,
zero failed/pending/todo tests and zero runtime error suites. PostgreSQL then
reports zero remaining clients and zero private api_boundary schemas. SDL retains
the canonical SHA256 above. No forceExit or source correction was used.

Further structural review covers80 DTO/input files (88 classes), with no methods,
accessors or constructors. Cross-checking all twelve original candidate files
against integrated main851c93a finds all75 original class/enum declarations
unchanged after ignoring whitespace and named-export modifiers. These checks
supplement, rather than replace, semantic review and full command exit evidence.

## Local audit disposition and review gate

All twelve confirmed mixed-role candidates are corrected on this phase branch.
Source comparisons preserve75 original class/enum declarations; focused behavior,
full opt-in API coverage, Web coverage/smoke, full migrated API E2E, workspace
quality and generated output checks supply the evidence described above.
Reviewed composition/configuration/use-case files retain their cohesive roles;
no further split is justified solely by file length. This is evidence-backed
disposition of the audit findings, not a promise that every future data flow or
all possible semantic defects are proven absent.

Remaining acceptance: phase diff review, push/PR and green remote CI. D6/D7 and
the separate stack audit remain required before the Phase11 brainstorm. DEBT-073
is owner-approved for a separate D6 package and is not fixed or waived in D5.
