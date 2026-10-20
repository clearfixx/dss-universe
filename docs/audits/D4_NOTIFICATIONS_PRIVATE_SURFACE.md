# D4 Notifications private provider surface

Date: 2026-10-20. Branch: `debt/d4-notifications-private-surface`.
Base: `dd4e644` / draft PR #62; not an accepted release baseline.

## Scope and evidence

This is the remaining bounded Notifications surface item from the D4 coverage
map. Current source search finds the preferences service only in its own module,
local resolver and tests. AppModule imports NotificationsModule for assembly;
no foreign application consumes the service. Notifications has no public barrel
and this packet does not invent one or add a replacement facade/token.

Remove only `exports: [NotificationPreferencesService]` from Nest metadata.
Keep the service, resolver, repository binding and PrismaModule import private
and unchanged. Update the module Passport to describe its actual responsibility.
No defaults, category normalization, repository/Audit behavior, API/SDL, schema,
permissions, delivery orchestration or frontend code changes.

The new metadata regression was run before the edit and failed because the
service was exported. After removal, the same assertion passes; it also verifies
the service and resolver remain local providers. Focused boundary/service tests:
3/3 pass. Existing App E2E covers defaults and owner preference updates; full
verification is pending, not replaced by metadata inspection.

Architecture140/140 and frozen zero inventory pass. That bounded static inventory
did not itself flag this concrete Nest export; the metadata regression covers
the specific omission without a broad analyzer expansion or baseline waiver.

## Verification status

Full API coverage1169/1169 passes (160 suites, zero skipped; 59.842 seconds),
with all four DB/Redis opt-ins. Workspace lint/typecheck, Prisma validation and
build pass; build exits normally with six successful tasks. Unit PostgreSQL5434 was stopped after the Docker crash;
its exact Compose identity/loopback port/tmpfs were checked before starting it
and applying production test migrations. Dev PostgreSQL5433 is not reset.

Adjacent suites pass: Editor23, Storage43, Worker46, Web59, dependency patches14.
Global format remains red on 41 existing files; dependency audit remains red
with 1 high and 10 moderate. Authored-file formatting/diff checks pass.

Fresh migrated full E2E completes 508 PASS / 1 FAIL / 0 skipped of 509,
48 suites, 390.573 seconds. Current report start is
2026-10-20T02:57:27.749Z; an old JSON left at the same cache path from October18
was explicitly excluded until the current run overwrote it. App27/27 passes,
including defaults/owner preference updates; both notification-preferences
atomicity cases pass. Only inherited DEBT-045 News viewCount null/zero fails.
Search performance and Leaderboards pass this run, not proof their residual
performance/fixture debts are resolved.

After full JSON, completed Jest retained handles. Zero DB clients and zero
api_boundary schemas were confirmed; only matching completed PID25616 stopped.
Original shell E2E=-1, not normal green completion. No rerun, skip, timeout or
assertion change. No dev database reset or production schema change.

GraphQL generation succeeds; consistency remains red on inherited DEBT-044
eslint-disable drift. Only this run's generated change was restored; SDL and
generated files then match Git. SDL SHA256:
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Fresh logs/JSON are ignored under node_modules/.cache/d4-notifications-\*.

CI publication/review is pending. No green CI, independent review, full D4 acceptance or Phase11 readiness is
claimed. Inherited red gates remain open and will be reported with fresh results.

## Remaining scope

This closes only the unused provider export after verification, not all
Notifications functionality. Future delivery/digest work remains in its planned
phase. Input-owned GraphQL enum organization is separate representation/Passport
cleanup, not silently changed here. Wider operation evidence reconciliation,
D5/D6/D7, stack-boundary audit and Phase11 brainstorm remain required.
