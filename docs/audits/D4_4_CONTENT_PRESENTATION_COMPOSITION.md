# D4.4 — Isolated content presentation composition

2026-10-19. Branch `debt/d4-content-graphql-composition`, parent `bcb6114` /
draft PR #50. Owner approved the isolated composition design and implementation.
This is a bounded pre-Phase-11 package, not full D4 acceptance.

## Implemented boundary

Root `composition/content-presentation` owns the single GraphQL identities for
`ContentGateOperator` and `ContentGateRequirementKind`, the existing content
inputs/output models and exactly two resolvers exposing four existing operations.
DTOs contain fields/validation only; explicit mapping and resolver logic live in
separate files. AppModule registers the root module. Former feature resolvers are
removed from feature providers and source locations, avoiding duplicate operations.

Content Access publishes separate create and policy-evaluate capability tokens;
Editor publishes separate preview and delivery tokens. Each has an owner-local
adapter delegating to the existing private service. Root imports only public
capability types/tokens/modules. No direct sibling feature import, neutral Shared
business enum, Prisma in presentation, generic enum registry or broad service
export is introduced. Existing narrow News/search decision contracts are retained.

Root allowlists current response fields explicitly. Editor capability results omit
the internal normalized document; delivery preserves only redacted JSON and
existing verdict fields. Creation validation, audience/Premium precedence,
normalization, rendering, redaction and provider-failure behavior stay with owners.
Root retains the existing group-key trimming and null normalization. Guards and
`ContentGatesConfigure` remain unchanged. No schema migration, permissions, policy,
cache, isolation, timeout, UI or scoring changes.

## Evidence checkpoint

Fourteen new unit cases plus five existing content integration cases pass:
**19/19**. Includes actual in-memory code-first schema generation, root provider
registration, feature import/ORM boundaries, guard metadata, unknown enum
validation, explicit response allowlists, owner delegation and failure propagation.
Test-only private imports exercise owner adapters; runtime root uses public tokens.

Initial schema comparison failed only because the test factory did not apply the
production `sortSchema: true` ordering. Using GraphQL's lexicographic sort matches
that existing setting; no production schema setting changed. Pre-transfer affected
SDL fingerprint is pinned to
`60abd5d5fc9b56c566b3b25cf23c335774db84b8028346a596d3d8d00686a2f6`.
Full schema file pre-transfer SHA-256 was
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Later HTTP boot/full gate must separately verify production schema compatibility.

Exactly two old presentation Prisma inventory entries removed, **70 → 68**, no
additions/regeneration. All remaining findings are wildcard exports; bounded AST
inventory is not proof of full architectural correctness. Exact approved public
surface fixtures are extended only for the new capability token/type names;
initial architecture tests rejected the old allowlists, not the isolation rule.

Full gates are running. HTTP regression, full E2E, GraphQL generation, CI/review/
owner acceptance remain pending. Known format/audit, DEBT-044/045/059 are not waived.
Full D4 reconciliation/enforcement, D5–D7, stack audit and Phase 11 brainstorm remain.

Initial full opt-in API coverage1134/1134 passes, 154 suites, no skips. Initial
typecheck/build/Prisma/architecture pass; lint detects three unbound method
references in the new metadata test. Read method descriptors as unknown and
narrow to function instead; no suppressions, policy changes or assertions removed.
Final source gates rerun after this correction and five new HTTP cases covering
all four unauthenticated operations, configure denial, creation/evaluation,
invalid enum rejection and provider failure. Adjacent Editor23/Storage43/Worker46/
Web59 pass. An initial mistyped patch script was not a test run; the actual
`test:dependency-patches` command then passes14/14. Global format/audit remain red.

## Final pre-full-E2E checkpoint

Final root lint/types/build/Prisma/architecture pass; opt-in API coverage again
**1134/1134**, 154 suites, zero skips, 58.513 seconds. Root tasks9/9/6 pass
(36.596s/19.258s/21.753s). Actual content HTTP suite **14/14**, normal exit0,
13.993 seconds: includes all five added cases and existing Premium/audience,
revocation, denied-subtree, duplicate-gate, missing-provider, News/comment cases.
Creation uses a test-local explicit permission assignment; no default role or
production seed changes. Management evaluation preserves audience denial even for
the gate author. Zero fixture schemas and clients remain after normal app close.

After that real AppModule boot, complete schema.gql SHA-256 still matches the
pre-transfer value above; no generated schema diff. This is actual production
transport boot evidence in addition to the in-memory affected-SDL test.

All pre-E2E commands terminal before full run. Exact tmpfs disposable5435 project/
service/sole loopback binding and zero clients verified, service recreated,
empty public schema verified and migrations applied without seed. Dev5433 and
persistent test5434 not reset. Full E2E currently running; GraphQL/CI/review/owner
acceptance remain pending. No full-green/debt-closure claim.
