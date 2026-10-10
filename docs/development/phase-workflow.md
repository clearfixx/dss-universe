# DSS Phase Workflow

## Authority and phase entry

Follow the [canonical roadmap](../roadmap/DSS_UNIVERSE_1.0_ROADMAP.md),
[current context](../PROJECT_CONTEXT.md) and
[pre-Phase-11 plan](PRE_PHASE_11_EXECUTION_PLAN.md). Phase 11 is not authorized
until D7 acceptance and a separate approved brainstorm.

Before each phase, brainstorm what will be built, how, why, ownership, alternatives,
threat model, data lifecycle, dependencies and acceptance tests. A fresh phase
uses its own `phase/<number>-<name>` branch after approval.

## Snapshot before code

Use repository-aware read-only inspection; do not regenerate existing modules.

```powershell
git status --short
rg --files apps/api/src
rg --files apps/api/src/modules/<module-name>
rg --files apps/api/src/core
```

Confirm existing files, allowed changes, forbidden changes, module ownership and
phase scope. If missing context would change architecture/product behavior, ask
the owner; otherwise make a documented narrow assumption.

## Execution flow

Snapshot → architecture review → owner-approved scope → package branch →
implementation → verification → documentation → review/PR/CI → acceptance.

Each debt package uses `debt/<package>`; audits use `audit/`, urgent isolated
fixes `hotfix/`. No `codex/` branches. Never mix multiple product phases in
one long-lived implementation branch. Stacked draft PRs must state their base;
they are not accepted baselines and must not be merged while required gates are red.

## Package controls

- Preserve architecture/style and user edits; use explicit named imports/exports.
- Each file has one owned responsibility; DTOs contain only their contract.
- Use narrow cross-module capabilities/events, not foreign internals.
- New/materially changed authored files follow the canonical File Passport.
- Do not edit generated output by hand.
- Frontend remains minimal verification using existing libraries; design work
  belongs to its separate owner.
- Newly discovered out-of-scope defects go into the debt register and are reported.
- Migrations/seed use disposable local/test databases.
- New ideas require impact review and approval before expanding scope.

Run the [full verification matrix](workflow.md#verification-contract).
Record actual results, skips, cache hits and baseline failures. A watcher or a
successful unit suite is not full build/E2E evidence.

Commit focused changes, push and open a PR; preserve review findings and CI evidence.
No false green status, no silent baseline suppression. Recommend the next model
only in the completed package's final report, before the owner launches it.
