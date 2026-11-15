# D7 — Integration checkpoint, 2026-11-15

Scope: integrate the agent's outstanding reviewed implementation and retained
D7 work into main before the owner's new working policy. This is a delivery
checkpoint, **not final D7 acceptance or Phase11 readiness**.

## Included work and authority

- Source guard PR162 was explicitly approved for merge by the owner. Reviewed
  head `a76b998` merged as `d4d0671` with the identical tree
  `33927e52882a17a712fb88b279a271e12fbd96b2`.
- That exact implementation passed CI8/8 and local quality:full exit0: unit1547,
  E2E883 with no skips/todo, build6/6, Web15 without retries and native48 per OS.
  The completed local run was Nov15 15:45:21–16:05:18 Kyiv time, with zero
  Kernel-Power42/107 events. The earlier incomplete attempt remains preserved;
  no terminal result or cause is invented for it.
- The old remote D7 head `ff46819` and the retained local head `81e0a65` contain
  additional audit history. This integration includes their Git ancestry and
  preserves the missing review/matrix/079/091 documents as dated evidence.
- Existing main versions of README, product/roadmap/context, architecture,
  execution plan, quality guidance, runtime plans and the debt register take
  precedence over older D7 versions. Reintroducing old unresolved/candidate
  labels would undo later owner decisions; no such rollback is intended.
- The stack audit plan is preserved byte-identically to the owner/frontend
  checkout: SHA256
  `B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.
  Integration of the plan does not execute or complete the stack audit.

Historical documents have explicit notices linking here and to the current
register. Their old test counts, missing artifacts, proposed directions and
acceptance statuses are dated evidence, not claims about current source.

## Current accepted scope

L1/PR159 synchronizes the Levels lock, authoritative balance read and owned
transition effects. PR160 records a proposed Points facet protocol. PR161 proves
the old award/source-control race. PR162 makes source-bound award share the
existing source-control lock before revocation lookup, preserving event→source→cap
order and current API/formula/transaction options. The old characterization was
replaced by fixed regressions and remains recoverable from Git.

These accepted scopes do not create qualified Points facet receipts, resolve all
publication-cycle provenance, activate gamification, replay historical events,
or finish the overall delivery work. Read the individual runtime/design records
for guarantees and limitations rather than interpreting merge as global closure.

## Still open after integration

The [current register](../development/DEBT_REGISTER.md) and
[D7 reconciliation](D7_CURRENT_ACCEPTANCE_RECONCILIATION.md) remain the starting
points for unfinished work. In particular:

- qualified Points control/contribution outcomes and cycle/provenance binding;
- C2.3 structural configuration/producer coverage, C3 durable delivery and D
  preflight/manual recovery/explicit activation;
- remaining owner decisions and registered risks, including the separate
  administrative-availability and Activity-ordering work;
- final D7 review/acceptance, then the separately planned stack audit and the
  required Phase11 brainstorm.

The owner deferred hostile-local-writer containment research: users access the
platform through the site/API, while the owner and DSS control filesystem writes.
Old opposite threat-model statements in the historical snapshot are superseded.
There is one Wiki product named Research Lab; historical Knowledge Forge naming
does not introduce a second module. Remaining naming discrepancies still require
reconciliation against owner decisions, not silent scope expansion.

## Verification and handoff

The integration must be documentation-only relative to accepted `d4d0671`:
no runtime, test, schema, dependency, workflow or frontend modifications. Verify
that boundary, formatting, preserved helper bytes and current-head CI before
merge. The preceding source guard full-gate evidence applies to identical
runtime/test/configuration code; do not relabel it as a new local run on this SHA.

Application Shell PR111 and its active frontend branch belong to the other model
and are outside this integration. The unrelated untracked local helper is also
excluded. After this checkpoint is tested and merged, stop and wait for the
owner's new policy; do not start another implementation or declare D7 complete.
