# D4 Media / Users profile-asset boundary foundation

Date: 2026-10-20. Source baseline: `1ba2c48`.
Branch: `debt/d4-media-profile-asset-foundation`.

## Authority and status

Owner approved detailed design and characterization, not runtime transfer.
Production code, schema, public API and query behavior are unchanged.
This is an intermediate foundation, not D4 acceptance or a completed package.

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

Before implementation approval, choose exact writer/reader adapter signatures
against existing guarded infrastructure-entry conventions and confirm they do
not expose a general-purpose Prisma client to a business consumer.

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
Independent review, full E2E and publication remain pending. The deterministic
concurrent-attachment schedule has not been tested; no concurrency guarantee
is inferred from sequential fixtures or mocked claim loss.

Global `format:check` remains red on 41 inherited files; dependency audit
remains red with 1 high and 10 moderate findings. These are not waived and no
unrelated formatting or dependency changes were made in this packet.

## Required next evidence before production transfer

- A deterministic interleaving test for attachment/recheck if a valid schedule
  can be constructed without changing current transaction semantics; otherwise
  explicitly record the unproved schedule, not a concurrency guarantee.
- Run targeted tests, type/lint and architecture checks, then the agreed full
  package gates. Keep inherited red baselines visible.
- Ask for runtime implementation approval after presenting this evidence.

This packet does not close global D4 coverage. Notifications' concrete service
export and remaining operation-level evidence reconciliation remain separate
work, followed by D5/D6/D7 and the agreed stack-boundary audit before Phase 11.
