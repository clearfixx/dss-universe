# D4 — Content Access operation reconciliation

2026-10-19, baseline `3def394` / draft PR #44; unaccepted review stack.
Documentation only; no runtime, schema, provider, permission or UI changes.

Read all 15 non-test module TypeScript files: module/index, three services,
repository/interface, domain types, four input ports, two verdict contracts and
GraphQL presentation. Also read README, four root evidence adapters, initial gate
migration/current schema, two full specs and policy spec scope/fixture portion
plus remaining titles. ContentAccess owns policies, not protected content/IAM.

| Operation           | Actual behavior                                                                                                      | Boundary/limit                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| create/validate     | 1–6 unique kinds; GROUP key/no threshold, numeric safe nonnegative integer/no key                                    | GraphQL validates enums; no arbitrary internal caller certificate                                 |
| repository create   | one nested gate/requirements create, own-field mapping                                                               | Owner FK reference, no profile read, Audit or Outbox                                              |
| findById/map        | own gate/requirements, missing null                                                                                  | No foreign aggregate query                                                                        |
| evaluate            | gate first; guest denied without viewer IO; authenticated evidence mandatory                                         | GROUP before author/Premium bypass; ALL/ANY numeric only                                          |
| viewer facts        | active account/age then parallel scalar comments/Reputation                                                          | Age floor/clamp; forumPosts/publications zero placeholders                                        |
| root adapters       | Auth active/date copy, Interactions count, Reputation signed total, Authorization audience at supplied time          | No credentials/profile/history; errors propagate                                                  |
| scope               | fixed viewer/time; lazy one evidence promise, gate read per evaluation; close clears reference/forbids later results | Drains evidence errors; not cross-request cache or DB snapshot                                    |
| decision projection | copied gate ID/allowed/bypassed/unmet/notice                                                                         | No owner/threshold/aggregate in exported verdict                                                  |
| GraphQL             | JWT + configure permission for create; JWT current-viewer evaluation                                                 | Evaluation returns full gate/requirements/times, unlike module verdict; no protected body fetched |

Schema/migration has unique gateId/kind, child cascade, owner FK restrict and
indexes, not universal DB policy validation or immutable audit history. No policy
edit/delete API or creation Audit event exists in reviewed code. Future lifecycle
requirements are not silently implemented. Named public/Nest token exports keep
services private; Prisma presentation enums and combined DTO/model/resolver file
remain D4.4/D5 review work. Layout alone proves no behavioral defect.

Fresh units: **57/57 PASS, three suites, normal exit 0**. Policy tests cover
audience-first bypass, failure/closure, fresh scopes and no role-derived Premium;
doubles do not prove live IAM or concurrent snapshot semantics. Parent PR #42
full E2E JSON confirms Content Boundaries **9/9 PASS**, historical not rerun here.

Full runtime gates not rerun for documentation only. Known parent format/audit/
GraphQL/E2E/retained-handle failures remain. Markdown format/diff checks required.
No closure/full-green claimed; owner reconciliation, D4.4/D4.5, D5–D7, stack audit
and Phase 11 brainstorm remain. Zero future counters and Phase 14 sanction
precedence are not certified by current tests.
