# DSS Universe — Product and Roadmap Audit

> Status: Static reconciliation complete; runtime acceptance remains pending
>
> Date: 2026-10-10
>
> Canonical roadmap: `docs/roadmap/DSS_UNIVERSE_1.0_ROADMAP.md`

## Executive decision

The implementation has progressed through Phase 10 and the post-Phase-10 Auth
UX Completion bridge. Phase 11 has not started. The repository must not describe
Phase 4, Phase 5 or the Engineering Handbook as current work.

Product delivery and release acceptance are currently different facts:

- major Phase 6–10 capabilities exist in code and architecture documents;
- the current quality baseline is red and cannot reproduce every historical
  completion claim;
- Phase 5 and Phase 8 have unresolved closure status;
- several cross-phase ownership promises have no canonical owner.

The truthful current state is therefore **debt closure before Phase 11**, not
Phase 11 implementation and not a rollback to an older phase.

## Phase reconciliation matrix

| Phase          | Documented status        | Evidence-based audit status                                                                    | Required decision                                            |
| -------------- | ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1–4            | Complete                 | Historical foundations exist; current full gate is not reproducible                            | Keep historically complete, repair regressed baseline        |
| 5              | No explicit status       | Partially delivered; Auth bridge exists, custom groups/delegation are absent                   | Close reduced scope or deliver missing IAM/group contract    |
| 6              | Complete                 | Local Media vertical slice exists; MinIO/S3 are not implemented and Worker security tests fail | Correct scope and fix security before reaffirming completion |
| 7              | Complete                 | Users/profile/social surfaces exist; runtime acceptance needs rerun                            | Retain status provisionally, verify after environment repair |
| 8              | In progress              | All package documents exist and final frontend document says complete                          | Produce one formal completion audit and reconcile status     |
| 9              | Complete                 | Completion audit and reusable platforms exist                                                  | Re-run its stated verification gate; current baseline is red |
| 10             | Complete                 | News packages and architecture exist                                                           | Correct Search wording and reproduce acceptance evidence     |
| Auth UX bridge | Complete by package docs | Verification, recovery, abuse protection, alerts, sessions and 2FA exist                       | Re-run security and end-to-end acceptance                    |
| 11             | Not started              | No Knowledge Forge module exists                                                               | Begin only after approved entry gate and brainstorm          |

## Canonical-document drift

### Stale Current Position

The canonical roadmap's `Current Position` still says Phase 4 is active and
describes early Media work as uncommitted WIP. This contradicts the same file's
Phase 6–10 sections.

`docs/PROJECT_CONTEXT.md` is dated 2026-07-18, describes Phase 3 as complete and
says the next major implementation phase is Phase 5. Its repository map,
quality snapshot and immediate execution order are no longer authoritative.

### Competing legacy roadmaps

`docs/roadmap/phases.md` defines an unrelated Phase 0–4 sequence and still marks
the Engineering Handbook in progress. `docs/roadmap/milestones.md` repeats the
same old milestone model. Neither clearly identifies itself as superseded.

These files should be archived or receive an explicit historical/superseded
banner and link to the canonical roadmap. Maintaining two active-looking phase
numbering systems is unsafe for autonomous development.

## Phase 5 ownership gap

The Phase 5 Definition of Done requires custom groups to be unable to escalate
authority. Its scope also requires:

- custom access groups separate from system roles;
- an allow-listed delegable permission builder;
- group presentation and time-bounded membership;
- Premium and Knowledge Forge Guardians as example groups;
- explicit authority policy for sanctions and protected actors.

No Access Group aggregate or persistence model was found. The only `groupKey`
in Prisma belongs to Content Gate requirements. Phase 7 documentation defers
custom groups to Phase 8, but Phase 8 delivers Reputation, Points, Levels,
Titles, Achievements and Leaderboards—not IAM groups.

Phase 9 then defers Premium override enforcement to Phase 14. This leaves both
Premium ownership and Knowledge Forge Guardian membership ambiguous immediately
before Phase 11 needs Guardian review/publish permissions.

Before Phase 11, choose one explicit model:

1. Phase 5 owns generic access groups and time-bounded membership; Phase 11
   consumes a narrow authorization capability for Guardians; Phase 14 owns
   sanction override precedence; or
2. remove generic groups from the 1.0 contract and define a narrower,
   permission-backed Guardian assignment owned by IAM.

The first option best matches the approved roadmap, but it must not make Auth
depend on profile or domain modules. IAM owns assignment; Authorization owns
the decision contract; Knowledge Forge asks only for capabilities.

Recommended model: `gpt-6.1-sol` xhigh for the ownership decision and ADR.

## Phase 6 scope mismatch

The roadmap calls Phase 6 complete and lists Local, MinIO and S3-compatible
storage contracts. Provider identities exist, but runtime binding and Worker
processing support only local storage. The current Worker also has a confirmed
Windows upload-root containment defect.

The phase can remain historically complete only if its wording is narrowed to
an extensible local provider foundation. If operational MinIO/S3 portability is
part of v1 acceptance, the phase requires a dedicated storage adapter package
and contract tests.

## Phase 8 closure

Every named Phase 8 package has an implementation document. The final
Gamification Frontend document explicitly says Phase 8 is complete, while the
canonical roadmap remains `IN PROGRESS`.

A formal completion audit should map the four Definition of Done statements to
code, migrations and tests, then record current architectural exceptions:

- broad foreign `UsersService` dependencies;
- Levels-to-CommunityPoints service coupling;
- Prisma representation leakage;
- runtime/PostgreSQL verification pending under the repaired environment.

These exceptions may become accepted debt, but they cannot remain invisible.

## Phase 9 and Phase 10 evidence quality

Phase 9 has a completion audit with a good ownership matrix, but its
Verification section lists commands rather than preserved outcomes. The current
root test and format baseline fails, so the historical gate cannot presently be
reproduced.

Phase 10 is documented as complete without an equivalent completion-audit
artifact. Its “Search integration” is a News-local search projection, not the
shared Search Platform implied elsewhere. The product behavior may be complete
while that platform claim is corrected.

## Approved current position text

The roadmap and Project Context should converge on the following meaning:

```text
Completed product delivery:
  Phases 1–4, 6–7, 9–10 and the Auth UX Completion bridge

Closure decisions required:
  Phase 5 IAM/groups scope, Phase 6 provider scope, Phase 8 acceptance

Current work:
  architecture, security, environment and quality debt closure

Next product phase after the accepted baseline:
  Phase 11 — Knowledge Forge
```

Phase 6 remains in the completed line only after its provider wording is
narrowed or missing adapters are scheduled explicitly.

## Pre-Phase-11 product decisions

The Phase 11 brainstorm must not begin implementation until the owner approves:

1. Guardian membership and permission ownership;
2. Premium bypass ownership and sanction precedence;
3. whether shared Search Platform is a prerequisite or a later projection;
4. whether Phase 11 uses only local Media in development or requires MinIO/S3
   contract parity first;
5. the exact Phase 5, Phase 6 and Phase 8 closure statements;
6. accepted debt exceptions, each with owner and expiry.

## Roadmap documentation acceptance criteria

- one visibly canonical phase numbering system;
- Current Position reflects debt closure before Phase 11;
- Project Context matches the repository and quality evidence;
- Phase 5, Phase 6 and Phase 8 have explicit closure/defer decisions;
- Phase 9 and Phase 10 claims distinguish local integrations from shared
  platforms;
- Phase 11 prerequisites and ownership contracts are approved;
- future deviations require a decision-log or ADR entry before implementation.
