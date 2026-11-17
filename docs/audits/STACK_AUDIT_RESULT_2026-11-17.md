# Bounded stack audit — 2026-11-17

Status: **review complete; stack retained**. Per the Final Audit Closure Directive,
this follows [D7 closure](FINAL_D7_CLOSURE.md), not another architecture audit.
Baseline main `a4a54511b84e2bd58955482282a13ec4c89dffe8`. No dependency, runtime,
frontend, OS setting, container or database was changed by this review.

## Actual versions and compatibility

Installed manifests were read across all11 workspaces, with no unresolved direct
dependencies. Lock SHA256:
`ef8ef6190b031d315d271a149da40db0f42021e2b571a99e22d2d2d5d15419db`.
Evidence: `node_modules/.cache/final-stack-a1d61dc6-7117-459a-aa75-f6ee6852bd16/`
contains installed engines/peers, registry audit and advisory/path inventory.
The read-only repeatable helper is `tools/agent-helpers/audit/stack-inventory.mjs`.

| Area              | Installed / observed                                                        | Bounded conclusion                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime/tooling   | Project Node24.22.3, pnpm11.9.0, TypeScript5.9.3, Turbo2.11.2               | The exact Node LTS security pin is aligned across local files, engines, CI and active verification helpers; native and full gates pass.                   |
| Web               | Next16.4.1, eslint-config-next16.4.1, React/DOM19.2.4                       | Matching Next lint version and React pair; installed Next Node>=20.9 and React19 peer ranges satisfied. Real build/smoke pass.                            |
| GraphQL           | Apollo client4.3.3, Next integration0.14.5, server5.5.1, GraphQL16.14.2     | Integration peers Next15.2.3/16, React19, Apollo4; server GraphQL^16.11. Installed combination fits these ranges and generated operations pass.           |
| API               | Nest core/common/platform11.2.7, GraphQL/Apollo integration13.4.5           | Nest Node>=20 and common11 peers satisfied; API build/HTTP/E2E pass. No framework migration justified.                                                    |
| Data              | Prisma/client/adapter-pg7.10.0; pg8.23.1; actual disposable PostgreSQL17.11 | Prisma CLI/client/adapter aligned; Node24 and TS>=5.4 requirements met. Migrated schema has zero drift; real transaction/concurrency suites pass.         |
| Background        | BullMQ5.81.5, ioredis5.11.1; actual disposable Redis7.4.11                  | Dedicated queue plus DB claims/receipts verified. At-least-once requires owner idempotency; Redis is not the authoritative economic ledger.               |
| Media/mail        | sharp0.35.5, Nodemailer10.0.16                                              | Node24 satisfies installed engines; SMTP STARTTLS is required by Worker production configuration. Nodemailer advisories remain below.                     |
| Editor/validation | Tiptap3.31.4 with exact pm3.31.4; Zod4.6.7 after override                   | Shared EditorDocument rules and server access checks remain authoritative. Tiptap free-license check passes. No paid extension adoption.                  |
| Tests             | Jest30.5.2 / ts-jest29.4.14; Vitest/coverage4.1.11                          | Installed ts-jest explicitly accepts Jest29/30 and TS<7; version prefixes alone are not a mismatch. Full tests pass. Vitest advisory maintenance remains. |

The integrated exact-runtime full gate passes API1632/E2E939, build6/6 and Web15/15
without skips/retries, with CI8/8 and native48/48 on three OSes. This demonstrates
the reviewed combination, not compatibility with every future minor/major.
Compose/CI use PostgreSQL17-alpine and Redis7-alpine tags; no production/image
digest/CVE scan was performed. Other optional services were not started.

## Security findings and finite follow-up

Fresh npm audit: **0 high,0 critical,28 moderate,3 low** (exit1 is expected for
reported lower-severity findings). This is not “zero vulnerabilities” and does
not cover Node or container vulnerabilities. The existing security gate blocks
high/critical and passed; the approved braces patch plus14 regressions verified.
No new exception or severity downgrade was introduced.

| Priority / boundary                       | Evidence and remaining action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolved 2026-11-17: runtime security pin | Node24.22.3 is coordinated across engines, CI, native guards/artifacts and current documentation. The official [24.22.3 release](https://nodejs.org/en/blog/release/v24.22.3) addresses the audit finding. Native48/48 and the exact-head full gate pass; a new policy test prevents pin drift. See the [verification report](NODE_24_22_3_SECURITY_UPDATE.md).                                                                                                                                                                                                                                                           |
| Before externally shared telemetry        | HTTP instrumentation0.220.0 is affected by [GHSA-3v2p-hm54-8qcq](https://github.com/advisories/GHSA-3v2p-hm54-8qcq), patched0.222.0: inbound URL-query credentials can enter spans. Installed pg instrumentation0.72.0 also exports db.user under [GHSA-qqmp-wf37-98f9](https://github.com/advisories/GHSA-qqmp-wf37-98f9), patched0.73.0; seven sibling instrumentations have the same advisory. API enables auto-instrumentation only with explicit exporter configuration. Treat exports as sensitive; schedule coordinated OTel package updates/redaction checks. No real credential export was inspected or claimed. |
| Mail maintenance                          | Nodemailer10.0.16 has address-parser advisories [nested comments](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8), [group parsing](https://github.com/advisories/GHSA-m943-m63m-w62w), [quoted local part](https://github.com/advisories/GHSA-85x2-q946-cp5h), all patched>=10.1.4. Worker sends account recipients; DTO email validation is not proof of parser safety for every input. Plan a focused update with recipient and Mailpit regressions; no delivery-to-wrong-recipient reproduction was performed.                                                                                                      |
| Frontend owner maintenance                | Next16.4.1 affected by [GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h), fixed16.4.5. Exploit requires a root-param-reading use-cache function also invoked through unstable_cache. Source search found neither construct in current Web src; installed affected version still requires maintenance. Next/eslint-config-next update belongs to the frontend owner, not an edit to their active branch.                                                                                                                                                                                            |
| Tooling/transitive maintenance            | Vitest mocker4.1.11 has two advisories (fixed4.1.12); shadcn→MCP→Hono4.13.13/node-server2.1.4 has seven (fixed4.13.16/2.1.6). Also js-yaml5.3.0→5.4.1, ip-address10.7.3→10.7.4, fast-uri3.1.8→3.1.9 (four), qs6.16.0→6.16.1, glob10.5.0/13.0.6→14.0.2, minimatch9.0.9/10.2.6→11.0.1. Follow actual parent paths in the retained inventory; some fixes cross majors, so no blanket overrides. These are installed matches, not31 proven DSS exploit paths. Keep development tools private.                                                                                                                                 |

These are bounded maintenance/backlog findings, not a restart of D7 or authority
for mass updates. No newly demonstrated critical DSS disclosure/data corruption
was found. Product development can resume; the runtime-pin condition is now
resolved. **Production security readiness remains conditional on addressing
applicable exposure risks**, especially externally exported telemetry.

## Deprecations, breaking risks and technology boundaries

- Actual pg8.23.1 integration logs warn that concurrent `client.query()` on one
  client will be removed in pg9. Do not upgrade to pg9 before checking Prisma
  adapter and transactional call behavior; current warning is not a reproduced
  production failure or proof of the cause of historical timing incidents.
- Lock metadata marks ESLint9.39.5 unsupported; OTel Jaeger propagator2.9.0 and
  sdk-trace-base/node2.9.0 deprecated; cron-parser4.9.0, glob10.5.0,
  subscriptions-transport-ws0.11.0 and the Apollo Playground plugin deprecated.
  Current API config uses GraphiQL only outside production, not that Playground
  plugin. Review parent-owned upgrades when touching those tools; no broad cleanup.
- jest-dom6.10.0 metadata describes an incorrectly published minor with Node>=22
  and a new DOM peer. Node24 and current full tests work; schedule an intentional
  compatible maintenance choice with the frontend owner, not an automatic major.
- Web Node types20.19.43 differ from API/Worker24.19.1 and runtime24.22.3; React
  types19.3.0 are ahead of runtime19.2.4. Current type/build checks pass. Avoid
  assuming newer declarations mean all APIs exist at runtime; align during the
  relevant frontend maintenance package rather than silently altering their branch.
- Next owns Web rendering/routing, Nest owns authenticated business operations;
  server access rules never depend on hiding UI. Prisma/PG owns transactional
  persistence, Redis/BullMQ scheduling and disposable hints. Existing owner-local
  ports/root composition remain the integration boundary.
- Apollo currently handles GraphQL/cache and generated documents; TanStack Query
  provider is present but no competing `useQuery` import was found in reviewed
  Web src. Zustand profile/shell stores contain local UI state. Keep one server
  cache owner per data flow rather than caching the same entity in all three.
  This is a review recommendation for subsequent work, not a new runtime change.

Node24 LTS status was checked against the [official release table](https://nodejs.org/en/about/previous-releases).
All other compatibility statements above come from installed package metadata
and the accepted full gate. Registry advisories and upstream pages were checked
2026-11-17; they are time-bounded. No claim of up-to-date production images,
latest-everything dependencies, complete penetration testing or production load
testing is made. The finite stack audit is complete; no technology replacement
or further global audit is initiated.
