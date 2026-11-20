# ADR-0007 — Documentation Types, Lifetimes and Checks

- Status: Proposed
- Date: 2026-11-21

## Context

On `main`, documentation is ~52k lines against ~65k lines of API source. Since
2026-10-15, 212 of 562 commits changed documentation only. `docs/audits` (138
files, ~17k lines) mostly records test counts, commit hashes and reproduction
logs that CI and pull requests already prove; such records age within days.
Some debts carry 10–20 documents, `PROJECT_CONTEXT.md` is weeks stale, and only
six ADRs exist. Readers, human or agent, cannot tell current truth from history.

## Decision

Documentation has exactly five types. Each has one place and one lifetime.

| Type      | Place                                     | Content                                                    | Lifetime                             |
| --------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| ADR       | `docs/adr/`                               | decision, reason, rejected options                         | permanent; superseded, not edited    |
| Spec      | `docs/specs/`                             | owner decisions, behavior, boundaries, packages of a phase | until the phase ships; then archived |
| Plan      | section of the spec or the PR description | scope and approach of one package                          | until the PR merges                  |
| Reference | module `README.md`, `docs/architecture/`  | current contracts, invariants, ownership                   | updated in the same PR as the code   |
| Status    | `docs/STATUS.md` (≤ 80 lines)             | current phase, open PRs, top risks                         | overwritten, never appended          |

Rules:

1. Verification evidence (test counts, hashes, logs, timings) belongs in the PR
   description and CI, never in `docs/`.
2. A decision that changes behavior, ownership or a boundary is an ADR, not a
   paragraph in a plan.
3. One debt is one GitHub issue labelled `debt`; designs live in the issue or,
   when large, in one spec section.
4. Change an existing document before creating a new one.
5. Every document starts with front matter:
   `type`, `owner`, `status` (`draft | accepted | superseded | archived`),
   `updated`, optional `supersedes`.
6. Size guides: ADR ≤ 80 lines, Status ≤ 80, Spec ≤ 600; longer means split or cut.
7. History is git history. Archived documents move unchanged to `docs/archive/`.

`pnpm docs:check` runs in CI and fails on: missing or invalid front matter,
broken relative links, Status older than the last merged phase PR, size limits,
and evidence patterns (for example `PASS 972/972`) in Spec or Reference. It
warns when a PR changes a module's `index.ts` or `contracts/` without touching
that module's `README.md`, and when Reference is older than 60 days.

`AGENTS.md` repeats rules 1–4 for every agent.

## Migration (separate package after acceptance)

1. Move `docs/audits/` and closed `DEBT_*` files to `docs/archive/` unchanged.
2. Extract decisions buried there into ADRs.
3. Replace `PROJECT_CONTEXT.md` with `STATUS.md`; reduce `DEBT_REGISTER.md` to
   issue links.
4. Add front matter to active documents; add `docs:check` to CI.

Active Research Lab evidence moves only with its owner's agreement.

## Consequences

- active documentation is expected to shrink to roughly 10–15k lines;
- agents spend effort on code and decisions, not on restating CI results;
- reviewers rely on CI and PR descriptions for evidence;
- history remains available in `docs/archive/` and git.

## Rejected options

- Keep the current practice: readers keep paying to separate stale from current.
- Delete audits outright: loses context some open debts still reference.
- Wiki outside the repository: drifts from code and loses review.
