# D4.4 — Users presentation and configuration representations

2026-10-19, branch `debt/d4-users-config-representations`, parent `4d1270b` /
draft PR #49. Unaccepted review stack; not Phase 11 or a release baseline.

## Bounded change

Users member-directory presentation now passes the existing owned string literal
`ACTIVE` instead of importing Prisma's enum. `ListUsersOptions` already accepts
that value. No status authority, filtering, pagination or access rule changes.

Configuration uses the explicit default Joi binding supported by the repository's
existing `esModuleInterop`/`allowSyntheticDefaultImports` and installed CommonJS
`export = Joi` declaration. This is a configuration-only external interop adapter,
not a namespace import or public business export. Retain Joi's method receiver;
do not destructure validation methods into unbound calls.

Seven new tests: two AST boundary assertions, full pre-transfer schema-description
SHA-256, development defaults, required production keys, valid synthetic production
configuration and timeout bounds. Before correction **5 PASS / 2 FAIL**; afterward
**7/7 PASS**. Schema-description SHA-256 remains
`a5cde90fe1e766caa47efa15f182b517528abaeec35ab1594cd26359e1c418ac`.
These tests supplement, not replace, runtime and HTTP verification.

Exactly two matching frozen architecture entries manually removed, **72 → 70**,
zero additions. No baseline regeneration. The two remaining Content Access/Editor
presentation Prisma findings require a separate composition package; the owner
rejected the proposed direct sibling wire-enum import. See the separate
[presentation design](D4_4_CONTENT_GRAPHQL_COMPOSITION_DESIGN.md). No such runtime
migration is part of this packet.

## Verification checkpoint

Full API opt-in coverage **1120/1120**, 152 suites, no failures. Root lint,
typecheck, build, Prisma validation and architecture/license checks pass. Adjacent
Editor, Storage, Worker, Web and patch tests pass. Global formatting remains red
on 41 inherited files; dependency audit remains red on 1 high/10 moderate findings.
No broad formatting or dependency change is bundled here.

All pre-E2E processes terminated before starting serial full E2E. Verified exact
disposable Docker project/service, sole loopback port 5435 and tmpfs, checked zero
clients, recreated only that service and verified empty public schema. Applied
migrations without seed. Dev 5433 and persistent test 5434 were not reset.
Full E2E is running; GraphQL/CI/review/owner acceptance remain pending. This is
not a full-green or debt-closure claim.

Full D4 source-operation reconciliation, remaining surfaces, D4.5 enforcement,
D5–D7, the separate stack audit and Phase 11 brainstorm remain required.
