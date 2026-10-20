# DEBT-070 — Viewer-safe social profile projections

Date: 2026-10-20. Owner-approved separate pre-Phase-11 security package.
Branch: `debt/debt070-social-profile-privacy`; base `eec1983` / draft PR64.
Status: local correction verified; inherited red gates and CI acceptance remain.

## Boundary and behavior

Users retains profile/privacy ownership. Existing direct-profile rules are
shared with batched projection, not copied into resolvers or DTOs. Privacy's
single and batch paths use one evaluator; Users' single and batch paths use one
field projection. Only the two social-list callers used the old unredacted
getManyByIds method; it is replaced with an explicitly viewer-aware method.

Followers/following still authorize the list owner's showFollows setting first.
BlockedUsers still derives list ownership from the authenticated actor. Owning a
list never bypasses privacy of someone else's profile. A profile's own viewer
retains the existing owner bypass. PUBLIC/MEMBERS/PRIVATE, field flags and
missing-settings defaults stay unchanged. No staff bypass or new ACL is added.

The edge page/count/order are untouched. Selected profile IDs are hydrated as
before, then privacy is fetched in one batch and fields are projected without
filtering records. The original ordered-ID mapping and totals/pages remain.
Empty pages skip profile/privacy hydration. Provider failure or incomplete
policy evidence fails closed; no raw-profile fallback or cross-request cache.
No migrations, new transactions, isolation/timeout changes, transport schema or
frontend changes. One batch privacy query is added per nonempty profile page;
this is required evidence, not a claim of unchanged total query count.

## Focused evidence

- The original real-App GraphQL characterization is converted into a security
  regression. Before production edits it fails exactly on private bio/location/
  interests being returned; red exit1, 7.386s.
- Five real-App migrated HTTP cases pass after correction, exit0, 16.354s:
  original leak, all three list routes with mixed visibility/field flags,
  ordering and complete page/empty-page totals, list-owner versus profile-owner,
  same-token privacy revocation, and injected batch-provider failure.
- Actual SQL statement capture checks one batch privacy read per nonempty page
  and no batch read for an empty page. Followers/following retain their separate
  list-owner policy read. No SQL parameter values are captured.
- Focused four-service unit suites pass23/23. Single/batch policy equality covers
  each visibility for owner/member/guest; duplicate IDs, defaults, empty inputs,
  failed/missing evidence and safe DTO mapping are covered.
- First expanded HTTP run had two owner lastSeenAt expectation failures because
  actual authentication updates that field. Corrected fixture assertions compare
  the response with the exact persisted timestamp; no clock or Auth mocking.
- First lint run flagged new unbound-mock assertions and a concurrently edited
  test's formatting. Assertions now inspect mock.calls, without lint waivers.
  Final lint/types subsequently pass without suppressions.
- Read-only comparison against the base preserves the existing field-projection
  body verbatim and the visibility-policy body after only substituting the same
  settings.userId owner coordinate. This complements, not replaces, regressions.

## Final local verification

Current full-tree checkpoint: API1175/1175,160 suites, zero skipped,66.246s,
all four DB/Redis opt-ins; workspace lint final exit0, types/Prisma validation/
generation pass; build six successful tasks,44.379s. Architecture/license140/140
and frozen inventory0 pass. Adjacent Editor23/Storage43/Worker46/Web59/patches14
pass. Global format41 and dependency audit one high/ten moderate remain red.
No schema, migrations, frontend or owner stack-plan changes are included.

Fresh full migrated E2E starts2026-10-20T16:58:42.811Z:513/514, zero skipped,
49 suites,403.725s. All five security cases and App27/27 pass. Only inherited
DEBT-045 News viewCount null/zero and its retirement-trigger cleanup fail.
DEBT-048 does not reproduce in this run, which does not prove it resolved.
After completed JSON, zero DB clients and zero api_boundary schemas were
verified; exact completed Jest18568 was stopped for retained handles. Shell
exit-1 is not normal green completion. No forceExit or DB protection bypass.

GraphQL generation succeeds; consistency exits1 on DEBT-044's generated barrel
comment. Only the verifier's own side effect is restored under an exact-content
guard. Git diff confirms unchanged SDL/operation output. SDL SHA256:
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Changed-file format/diff checks pass. Dev5433 remains untouched; full E2E uses
the verified disposable tmpfs5435 after fresh migrations and Redis6380 PONG.

Parent PR64 CI checkpoint: both storage containment jobs succeed; dependency
audit fails on the existing braces advisory and Web smoke has three locator
failures waiting for the existing Enter Station link (DEBT-034). Main quality
job is still running. These are inspected job results, not inferred from a red
badge. No dependency, frontend selector or timeout change is included here.

## Acceptance remaining

Publish a separate draft PR and obtain CI/review acceptance before merge.
Inherited format/audit/E2E/consistency gates remain red; no waiver. This package
does not resolve DEBT-045/048/044/034, dependencies or full D4 readiness.
