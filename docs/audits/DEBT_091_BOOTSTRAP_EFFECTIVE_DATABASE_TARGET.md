# DEBT-091 — Bootstrap effective database target guard

Date: 2026-10-29. Status: OPEN; separate correction not authorized.
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

## Proposed separate package

Review a strict URL query policy before install/up/deploy/seed, preserving the
generated schema=public URL and reviewed legitimate local options. Fail closed
on unreviewed target overrides rather than rewriting credentials or silently
changing user configuration. Characterize API and Worker file/process layers,
encoded/duplicate query keys and supported connection options. Use virtual or
stubbed commands and driver metadata; no remote connection is required.

Runtime/script changes, regressions and full quality acceptance require a
separate owner-approved package. DEBT-031 remains open routeM; DEBT-012/030/032
scoped readiness does not waive arbitrary override safety. No production UI,
scoring rule, database migration or service restart is included here.
