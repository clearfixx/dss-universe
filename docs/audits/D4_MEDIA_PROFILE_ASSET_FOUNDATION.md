# D4 Media / Users profile-asset boundary foundation

Date: 2026-10-20. Source baseline: `1ba2c48`.
Branch: `debt/d4-media-profile-asset-foundation`.

## Authority and status

Owner initially approved detailed design and characterization. After the
concrete proposal was presented, the owner approved a separate runtime
implementation after foundation verification. This branch does not implement it.
Production code, schema, public API and query behavior are unchanged.
Draft PR: https://github.com/clearfixx/dss-universe/pull/61.
This is a bounded foundation, not D4 acceptance or a green release gate.

## Current ownership gap

`PrismaMediaRepository` knows Users-owned reverse profile relations
`avatarFor` and `coverFor` in three operations. The existing predicates are
protective and must not be removed. This is ownership coupling, not evidence
of a new attachment bypass or data-loss defect.

| Operation                | Behavior that must survive composition                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browseLibrary`          | Profile absence only when orphan filtering is requested; no active Media references; existing search, cursor, ordering and first + 1 unchanged                                              |
| `getLibraryMetrics`      | Five independent reads, not a transaction; profile absence only for orphan count; DELETED excluded from byte totals and orphan count; null sums become zero                                 |
| `claimCleanupCandidates` | Serializable transaction; READY/FAILED/REJECTED strictly older than cutoff, or DELETING regardless of age; no active references or profile bindings; createdAt ascending and existing limit |
| Cleanup claim update     | Recheck both profile bindings and active references per candidate; existing four allowed statuses; audit only successful claims, inside the same transaction                                |

Cleanup storage-key order remains original, temporary keys, then variants.
Physical storage deletion is outside this database claim transaction and is
not made atomic by the proposed ownership change.

## Proposed concrete boundary

1. Users supplies a named, infrastructure-only pure predicate describing
   absence of avatar/cover binding. It does not fetch profiles, credentials,
   statuses or permissions and does not add ACTIVE filtering.
2. Media retains its owned query fragments, mapping, statuses, references,
   candidate selection/claim algorithm and audit behavior.
3. Root infrastructure composes these owner fragments for exactly the three
   affected operations. The cleanup predicate must be applied to both
   candidate selection and guarded update, using the same transaction client.
4. The module-local business contract remains repository-neutral. Prisma
   fragments are restricted to technical infrastructure entry points; no
   Media-to-Users import, generic query facade or public Prisma business port.
5. Existing callers receive the same values and errors. No tables, new
   transaction on metrics, isolation changes, timeouts, retries or cleanup
   lease are introduced.

### Concrete implementation proposal (not implemented)

Follow ADR-004's guarded technical entry convention, not a new integration
framework. The existing profile-asset composition demonstrates the global
binding pattern; the Leaderboards composition demonstrates a consumer-owned
facts port. Proposed names below describe the intended implementation surface.

- Users infrastructure exports `unusedProfileAssetWhere()` through its existing
  named `infrastructure.ts` entry. The return type is
  `Pick<Prisma.MediaWhereInput, 'avatarFor' | 'coverFor'>`; the implementation
  returns only the two null relation filters. It does no IO and reads no user
  facts. It is not exported through the Users business entry.
- Media owns a repository-neutral `MEDIA_LIBRARY_PERSISTENCE` token and a
  `MediaLibraryPersistence` interface containing exactly `browseLibrary(query)`,
  `getLibraryMetrics()` and `claimCleanupCandidates(olderThan, limit)`, with the
  existing domain inputs/results. It grants no extra operation or permission.
  `PrismaMediaRepository` delegates only those three methods; the rest of the
  existing repository stays in place.
- Media infrastructure owns `PrismaMediaLibraryOperations`: the existing fixed
  browse/metrics queries, mapping and cleanup selection/update/audit algorithm.
  Technical methods receive the appropriate Prisma client and an additional
  external-binding absence predicate (`Prisma.MediaWhereInput`), never an
  arbitrary SQL string, callback, repository registry or business policy.
  Cleanup receives the current transaction client; it does not start a nested
  transaction. The predicate is used in both selection and guarded update.
  This adapter is published only via Media's guarded infrastructure entry.
- Root `PrismaProfileAwareMediaLibrary` implements the three-method semantic
  port. It obtains the pure Users predicate and invokes the Media-owned
  operations. Browse and metrics use the ordinary Prisma client. Cleanup alone
  starts the existing Serializable transaction and supplies its client to the
  Media operation. Audit remains inside the Media operation in that transaction.
- A root-installed binding module exports only the semantic token. Feature
  modules import neither this composition module nor each other's internals.
  There is no new HTTP/GraphQL operation and no Prisma in the semantic port.

The technical predicate parameter is intentionally not a business API: only
allowlisted root infrastructure can assemble it. Add exact entry export and
provider metadata tests, plus analyzer negative fixtures proving application
and sibling feature consumers are rejected. Do not broaden the architecture
baseline to permit new violations.

Move the existing characterization to the operation adapter/composed port as
appropriate, retaining repository delegation tests. Run DB evidence against the
actual composition, not merely a copied version of the old implementation.
The current tests prove the baseline only; they cannot certify unimplemented
adapters. No inheritance-based repository override is needed.

## Characterization evidence

New `prisma-media-profile-boundary.spec.ts`: 3/3 tests passed against the
unchanged repository. They assert the actual delegate arguments for orphan
browse (and absence of those filters in ordinary browse), metrics read count
and null sums, cleanup selection and guarded update, Serializable options,
and skipping audit/results for a lost claim.

These tests use mocked delegates. They do **not** prove PostgreSQL relation
semantics, rollback, simultaneous attachment safety or lock behavior. They
must not be cited as migrated-database regressions.

`media-profile-boundary.persistence.spec.ts`: 5/5 PostgreSQL tests passed.
Fixtures live in a random schema on test PostgreSQL 5434. Tables and enum
labels are cloned from the migrated public schema; relevant avatar/cover and
Media-reference/variant foreign keys are installed locally. This is not a
fresh migration replay or a complete copy of every production constraint.
The suite drops only its own generated schema.

Observed: avatar/cover/active-reference exclusions, removed-reference inclusion,
orphan count, claim targets, protected records unchanged, strict cutoff,
eligible/ineligible statuses, DELETING recovery, oldest-first limit, and actual
audit insert plus claim rollback after an injected subsequent audit failure.
The final focused run additionally covers PROCESSING exclusion and exact
byte totals excluding DELETED originals and their variants: 8/8 tests across
both suites.
The first two runs failed in fixture enum setup (missing local enum, then
domain/operator mismatch); local enum cloning and column conversion fixed
the harness without changing production code.

Architecture, workspace lint/typecheck, Prisma validation and workspace build
passed. Final full API coverage passed 1165/1165 (158 suites, zero skipped,
58.935 seconds); the final focused suite passed 8/8.
Independent review and CI acceptance remain pending. The deterministic
concurrent-attachment schedule has not been tested; no concurrency guarantee
is inferred from sequential fixtures or mocked claim loss.

Global `format:check` remains red on 41 inherited files; dependency audit
remains red with 1 high and 10 moderate findings. These are not waived and no
unrelated formatting or dependency changes were made in this packet.

## Full verification completion (2026-10-20)

Fresh disposable PostgreSQL 5435 was verified by exact Compose project/service,
loopback binding, tmpfs data directory and zero clients before recreation.
The empty database received production migrations without seed. Dev 5433 and
unit-test 5434 were not reset.

Full API E2E completed 505 PASS / 4 FAIL / 0 skipped of 509, 48 suites,
461.887 seconds. App27/27 passes. Failures:

- DEBT-045 News foundation expects null viewCount but receives zero.
- Two News search performance cases exceed the existing 5000ms interactive
  transaction budget (5383ms and 5243ms observed); residual DEBT-053 performance
  risk, not a new Media runtime regression. No causal host-load claim.
- Leaderboards expects its own fixture first, but an earlier Community Points
  fixture has equal points and legitimately wins by age. Safe-field SQL confirms
  both identities and timestamps; points-suite cleanup only removes Outbox rows.
  Separate DEBT-069 records test isolation debt, not a production ranking bug.

Completed Jest retained handles after full JSON. Zero database clients and zero
`api_boundary_%` schemas were confirmed, then only PID13228 (matching the unique
report path) was stopped. Original shell reported E2E=-1; not normal successful
completion or a green gate. No rerun, skip, timeout increase, corpus cap,
assertion relaxation or trigger weakening was used.

Adjacent fresh tests pass: Editor23, Storage43, Worker46, Web59, dependency
patches14. GraphQL generation succeeds but consistency fails on inherited
DEBT-044 generated eslint-disable drift. Only this run's generated change was
restored; SDL and generated files then match Git. SDL SHA256:
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.

CI inspected at test head18265e8: Linux/Windows containment SUCCESS, dependency
audit FAILURE, Web smoke FAILURE, main quality IN_PROGRESS. Web smoke fails
at Web E2E; step logs were unavailable while the workflow was running, so its
underlying cause is not asserted. Documentation follow-up changes PR head;
these observations remain head-specific, not future-head CI acceptance.

Local logs/reports: ignored `node_modules/.cache/d4-media-profile-*`.
Owner's untracked `docs/audits/STACK_AUDIT_PLAN.md` is untouched and excluded.
SHA256: `B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.

## Required next evidence before production transfer

- A deterministic interleaving test for attachment/recheck if a valid schedule
  can be constructed without changing current transaction semantics; otherwise
  explicitly record the unproved schedule, not a concurrency guarantee.
- Run targeted tests, type/lint and architecture checks, then the agreed full
  package gates. Keep inherited red baselines visible.
- Runtime implementation is approved as a separate package; preserve all red
  baseline dispositions and independent acceptance requirements when proceeding.

This packet does not close global D4 coverage. Notifications' concrete service
export and remaining operation-level evidence reconciliation remain separate
work, followed by D5/D6/D7 and the agreed stack-boundary audit before Phase 11.
