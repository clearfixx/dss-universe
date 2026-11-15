# DEBT-091 — Bootstrap effective database target guard

> Historical reproduction and candidate-verification notes retained from
> `81e0a65`. PR110 was subsequently accepted and its implementation is already
> in current main. Pending/running/candidate statements below are historical,
> not new work or an instruction to rerun bootstrap.
> See the [accepted policy](../development/DEBT_091_BOOTSTRAP_TARGET_POLICY.md)
> and [integration checkpoint](D7_INTEGRATION_CHECKPOINT_2026-11-15.md).

Date: 2026-10-29. Status: RESOLVED for the scoped bootstrap guard; accepted PR110834ea0b.
Scope: development bootstrap safety, discovered during DEBT-031 D7 review.

## Confirmed evidence

The current bootstrap validates URL authority host/port/user/database against
local root Compose before installation, deployment and seed. It does not inspect
query-parameter coordinate overrides. The actual seed uses PrismaPg with
process.env.DATABASE_URL; PrismaPg delegates PostgreSQL connections to pg.

An isolated VM evaluates the current bootstrap control flow with virtual files,
synthetic credentials, stubbed child processes and no network. Plain local URL
passes as expected. The same authority with host=synthetic.invalid or port=6543
in the query also passes and reaches stubbed deploy/seed commands. The installed
pg Client constructor resolves the former to synthetic.invalid and the latter
to6543. No Client.connect/query is called. Every case has zero real child
processes, connections and file writes. The probe itself only saves its report.

Source anchors: scripts/bootstrap.mjs local coordinate guard;
apps/api/prisma/seed.ts PrismaPg connectionString;
apps/api/prisma.config.ts seed command and datasource URL.
Probe checkedAt: 2026-10-29T04:48:23.053Z.
Report SHA256: 2f8e3bede3bde3e9ffaa881bb513e046c32a53f5ec60ebd9734b01d61b48faed.
Ignored evidence in D6: node_modules/.cache/d7-bootstrap-isolated-probe.mjs and
node_modules/.cache/d7-bootstrap-isolated-probe.json.
The first harness attempt lacked the VM URL global and failed before producing
evidence; providing the standard URL constructor corrected the harness only.

## Risk and limits

The guard does not prove that the effective PostgreSQL driver target remains
local. This is a safety gap for manually supplied or inherited environment URLs,
not proof of remote access, data mutation or current-primary compromise. Current
primary effective coordinates were independently verified local. Prisma migrate
engine URL interpretation and real deploy/seed were deliberately not executed;
do not claim that migration itself reached an external database.

## Accepted correction checkpoint

Owner accepted PR110834ea0b; merge289b24cf78be3e960458a04285d724e8f2a9eb63
at2026-10-29T08:45:25UTC. Exact-head CI5/5 and full local gate0, coverage8/8
(API1466/1466), E2E688/688 across64 suites without skips, build6/6 and Web15/15
without retries passed. Local E2E SHA256:
e38e043548a101c9d5f4c9fd9ab21e4c2c501bd9f36344451a79b9376d2ffa2e.
CI E2E SHA256:8c142c9e3bbf79336b3e13602a308387ccc1951fe53a8dc915e79d82f141da08.
Current primary API CLI/API-local/Worker file views pass the pure guard without
environment edits, DB access or mutations. Primary main is synchronized; local
env and owner audit-plan hashes are preserved.

Gate07:38:51–08:42:12UTC includes confirmed Windows sleep07:43:30–08:29:25UTC.
The resumed gate passed every assertion; no uninterrupted/performance claim is
made. Earlier source-changing run and masking-case red/green evidence remain.
D7 release acceptance, arbitrary process-control certification and other debts
are separate. Only accepted main source is imported into the D7 review branch.

## Earlier approved-package checkpoint before acceptance

Review a strict URL query policy before install/up/deploy/seed, preserving the
generated schema=public URL and reviewed legitimate local options. Fail closed
on unreviewed target overrides rather than rewriting credentials or silently
changing user configuration. Characterize API and Worker file/process layers,
encoded/duplicate query keys and supported connection options. Use virtual or
stubbed commands and driver metadata; no remote connection is required.

Owner approved the separate package and exact policy: no query or only literal
?schema=public; other parameters, duplicates and fragments are rejected.
Candidate [PR110](https://github.com/clearfixx/dss-universe/pull/110), head834ea0b,
implements the pure policy and six passing isolated regressions in its own branch.
CI5/5 and its downloaded E2E688/688 across64 suites without skips are verified.
The actual CI quality-policy step ran the six new regression groups. A masking
case first failed on503a6ae: safe API .env.local hid an unsafe .env used by CLI.
The updated guard checks CLI file/process and API local/process views separately;
that focused case now passes and its red/green logs are retained.
A new exact-head full local gate is running sequentially after the prior exit0
run. That prior run changed source mid-flight and is superseded evidence, not
current-head acceptance. Scoped acceptance remains open. Candidate source is
not imported into this D7 review branch. DEBT-031 remains open routeM; DEBT-012/030/032
scoped readiness does not waive arbitrary override safety. No production UI,
scoring rule, database migration or service restart is included here.
