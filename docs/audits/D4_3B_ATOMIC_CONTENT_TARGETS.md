# D4.3b — Atomic content and interaction targets

Date: 2026-10-13. Status: bounded local implementation verified, review/final-head
CI acceptance OPEN. Branch: `debt/d4-module-boundaries`, draft PR #10.
Increment review base: `f9784af`; stack still depends on unaccepted D3.5 PR #9.
No merge, release acceptance or completed D4 claim.

## Ownership and implementation

News and Users infrastructure no longer inject a foreign target service. Their
consumer-owned semantic ports describe only News draft create/save and Profile
Wall create/tombstone. No Prisma client, transaction callback or ambient context
crosses those ports. Two explicit root infrastructure units of work coordinate
the existing synchronous multi-owner transaction; ordinary reads, use-case
validation and owner policy remain in their modules. No generic framework or
universal repository facade is introduced.

The Interactions target writer is persistence, not an application service. It
is relocated and renamed `PrismaInteractionTargetWriter`, removed from the
business root and Nest exports. Comments continue using their owned private
writer. Root infrastructure uses one explicit technical entry to reuse the same
stateless target/audit/outbox algorithm, not a copy or a separate transaction.
The new independently blocking `infrastructure-entry-business-import` rule permits
only owner infrastructure or root infrastructure/assembly; even a module file
inside root application/presentation/domain is forbidden. The report scans root
composition as well as modules/core. Public business roots cannot re-export this
entry. ADR-004 and the tooling document record this technical/business distinction.

News retains target registration, draft/revision persistence, attachment linking,
audit and outbox inside one transaction. Save retains optimistic version matching,
revision evidence, attachment retirement/revival and slug-conflict behavior.
Profile Wall retains post/target/reference creation and tombstone/target lock/
reference retirement plus audit/outbox inside one transaction. The bounded stored
Wall result returns only selected fields; tombstone redaction remains in Users.
Deletion actor/reason and retained content are not destroyed or newly exposed.

AST-printer comparisons against the increment base match ten transferred/retained
methods: four News algorithms, three target algorithms, two Wall write algorithms
(only semantic return type/projection substitutions) and owned Wall redaction.
Event names, versions, categories, producers and payload selection are preserved.
No API/DB schema, migration, dependency, frontend, owner/Command Deck authority,
scoring or Phase 11 feature changes are made.

## Real transaction evidence

Seventeen new AppModule E2E cases apply all actual migrations in a UUID-owned
disposable PostgreSQL schema. Temporary test-owned insert-rejection triggers fail
the chosen target/content audit or outbox stage; production immutability triggers
are never disabled. Each trigger/function is removed in `finally`, then the fixture
drops only its own schema.

- Four News creation and four Wall creation failures leave all seven participating
  table counts unchanged: articles, revisions, wall posts, targets, references,
  audit and outbox. Neither a ghost target nor a partial content row survives.
- Four Wall deletion failures retain the active target/reference and original
  undeleted post without deletion metadata/evidence. A subsequent successful retry
  locks the target, retires the reference, retains raw history and returns the
  same redacted tombstone with actor/reason stored.
- Two News save failures retain version/title, revision count and active attachment.
  Parallel same-base saves produce one winner, one null conflict and exactly one
  new revision/audit/event. No timing sleeps or broader timeout workaround is used.
- Successful News target/content events retain owner coordinates, producer,
  category and version, with no raw document in their payloads. Sequential target
  registration/status retries remain idempotent; conflicting ownership is rejected.

The tests do not claim stronger concurrent target-retry semantics than the inherited
algorithm. Media fixtures are database metadata, not a claim of real binary/provider
upload verification. Five pure boundary tests pin semantic delegation, failed-write
propagation, owned redaction and private technical Nest exports.

## Quality gates and limits

| Check                                 | Result                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| Full scoped unit/integration, serial  | PASS: API 644, Web 59, Worker 36; all DB/Redis opt-ins enabled        |
| Relevant AppModule E2E                | PASS: 54 in seven suites, including 17 new transaction cases          |
| Full scoped coverage, serial          | PASS: API 552 pass / 92 opt-in skipped; Web 59, Worker 36, Storage 43 |
| Root lint/typecheck                   | PASS; no rules disabled                                               |
| Production build                      | PASS with `--concurrency=1`; API fresh, five unchanged builds cached  |
| Prisma validate / migration status    | PASS: 53 current migrations; no schema/migration change               |
| Architecture/license/baseline         | PASS: 46 fixtures; 103 → 99, zero additions/exemptions                |
| Changed-file format / diff whitespace | Checked before commit                                                 |
| Global format                         | RED: inherited 41 legacy files, DEBT-022                              |
| Generated GraphQL consistency         | RED: only inherited DEBT-044 barrel lint comment; schema unchanged    |
| Dependency audit / patch regressions  | RED: 1 high / 10 moderate; 14 patch regressions PASS                  |
| Full E2E, review and final-head CI    | OPEN, not inferred from focused passes                                |

Parallel initial unit/coverage/build processes exhausted Windows process allocation
capacity; Node and one PowerShell process failed, so those runs are not passes.
After their handles were terminal, complete scripts were rerun sequentially:
API units already run in-band, Web/Worker use two workers, API coverage uses
`--runInBand`, build uses `--concurrency=1`. Test scope and coverage thresholds are
unchanged. The 92 skipped coverage opt-ins pass in the separate full DB/Redis run.
No OS setting, pagefile, Node heap override or project dependency is changed.

A DB query confirms no `api_boundary_*` schema remains after verification.
Dev/production databases and frontend stay untouched. The owned codegen side
effect in the initially clean generated Web barrel is restored, not committed.

## CI finding and remaining scope

At `f9784af`, run `38446264899` passed architecture, migrations, lint and types,
then failed in Web coverage: 25 suites / 59 tests passed, but an uncaught
`window is not defined` arose in React scheduler, attributed by Vitest to the
editor AI dialog test context. API E2E/generated/build steps were skipped, not
live. DEBT-050 records the evidence and proposed D6/frontend-test investigation;
no out-of-scope frontend fix is implemented. Windows/Linux storage passed;
audit and Web smoke were red. New-head CI must be evaluated independently.

Exactly four reviewed findings are removed: one business concrete export, two
foreign writer injections and one application-layer persistence import. No
baseline is expanded. This inventory is bounded syntactic evidence, not full
ownership/security compliance. The technical-entry rule is blocking; historical
unclosed diagnostics remain visible.

D4.3 still requires policy registration, News/Media and activity contracts.
D4.4/D4.5 explicit surfaces, ORM isolation, cycle/enforcement/acceptance and D5–D7
remain required. Stop before Phase 11 for its mandatory brainstorm.
