# Phase 13 P-0 — Shared Polls

Status: implementation package under review. Stacked on M-0
(`phase/13-m0-sanctions-core`); not an accepted baseline.

## Scope

P-0 adds one shared poll capability that Community Hub topics (CH-3) and later
News articles attach to their Interaction Target. Owner decisions from the
Phase 13 brainstorm:

- anonymous or open visibility is chosen per poll;
- no deadline;
- a vote cannot be changed;
- one shared module for every product.

Placement: Polls is a bounded context of the Interaction Platform, next to
Comments, Reactions and Bookmarks. It reuses Interaction Target owner policies
instead of introducing a parallel authorization registry. The brainstorm's
"Polls (new, shared)" owner row is satisfied by this context.

News has no persisted polls today, so no data migration is required; News will
attach polls through the same contract when its editor exposes them.

## Model

| Table                 | Rule                                                        |
| --------------------- | ----------------------------------------------------------- |
| `polls`               | one per Interaction Target; question 3–300; `maxChoices` ≥1 |
| `poll_options`        | 2–20 per poll, ordered, label 1–200, unique per poll        |
| `poll_ballots`        | primary key (poll, voter): one ballot per voter             |
| `poll_ballot_choices` | composite FKs keep every choice inside its own poll         |

All four tables are immutable (triggers reject `UPDATE`/`DELETE`). A poll and
its options cannot be edited after creation; a ballot cannot be changed or
withdrawn.

`maxChoices` defaults to 1 (single choice). Owners may allow multi-choice up to
the option count; the owner left single/multiple unspecified, so both are
supported and the product UI decides which to expose.

## Authorization

- Reading results uses the target owner's `READ` decision (guests included).
- Voting uses the owner's `REACT` decision, so closed/archived/trashed topics,
  locked targets and owner sanction rules deny voting without poll-specific
  code. Read-only subjects are also blocked by the M-0 global interceptor.
- Poll creation is owner-only through `POLL_COMMANDS.createPoll`; there is no
  public create mutation. When an owner needs topic and poll in one
  transaction (CH-3), root composition owns that atomic write, as it already
  does for News drafts. No transaction client crosses the domain port.

## Visibility

- Results (per-option counts, total ballots) are visible to every reader.
- `OPEN` polls list voter IDs per option (`pollOptionVoters`).
- `ANONYMOUS` polls never list voters, and the ballot Outbox event omits the
  chosen options. Audit records still identify the voter as the actor, for
  abuse investigation only.

## Events

`polls.created.v1` and `polls.ballot.cast.v1` (integration, producer
`dss.api.polls`) with matching audit records.

## Verification

- Prisma format/validate and zero schema drift;
- poll rule and service unit tests;
- migrated-database e2e: ordering, one ballot under concurrency, multi-choice
  counts, open voter listing, anonymous evidence, immutability, cross-poll
  choices and one poll per target.

Recorded local results (2026-11-20, Node 24.22.3, disposable `dss_test`):

- migration applied to `dss_test`; zero Prisma schema drift;
- API unit suite: 1614 passed, 106 skipped by the existing opt-in policy;
- shared polls e2e 7/7; full API e2e: 89 suites, 979/979 passed;
- architecture inventory: 0 findings; lint and typecheck clean; generated
  Web GraphQL client unchanged.

GitHub CI on the committed PR head remains the acceptance gate.

🗳️ A poll is a question asked once and answered once — by each of us.
