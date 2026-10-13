# D3.5 increment — Premium audience/threshold contract

Date: 2026-10-13. Branch: `debt/d3-5-premium-gate-contract`.
Stack base: `5896013` from `debt/d3-auth-identity-boundary`; D3 is not accepted.
This is the approved bounded gate correction, not full D3.5 delivery.

## Behavior

GROUP constraints are mandatory audience checks before author/Premium preview.
ALL/ANY applies to numeric thresholds only. Premium automatically bypasses those
thresholds after audience membership succeeds. A GROUP-only policy does not
claim a numeric bypass. Inactive/missing viewers cannot receive preview/bypass.

Six new unit expectations initially failed against the legacy implementation,
including Premium bypass of GROUP under ALL/ANY and mixed ANY admission through
audience alone. Corrected behavior passes 19 evaluator tests. Seven isolated
PostgreSQL tests use real persisted gates/roles/status and the real editor
normalizer/redactor; denied secret text never reaches the serialized projection.
Immediate audience/Premium revocation and three inactive states are covered.

A real GraphQL/HTTP E2E keeps the same subject token across audience grant and
revocation; it denies Premium alone, allows Premium plus audience, then denies
again. The fixture also cannot read IAM permission administration. This proves
that no staff access was added by this flow, not a universal role-type guarantee.

## Compatibility and boundaries

- Legacy mixed ANY gates become stricter: group membership cannot be substituted
  by a numeric threshold or Premium. No persisted rules are rewritten or deleted.
- A read-only disposable DB inventory found no mixed GROUP/numeric policies at
  verification time; this is not an inventory of a production deployment.
- The adapter still uses trusted IAM role names as transitional membership facts.
  Stable access-role identity, generic memberships/expiry and capability allowlists
  remain wider D3.5 work. The separate PremiumGrant product proposal is superseded.
- Category/section/news ACL builders, inherited audience, administrator/owner
  protection, sanctions and deleted-content policy remain owning-phase work.
- No new staff/Guardian permissions, schema, migration, dependency or UI changes.
- The ADR records the semantic change before production implementation.

## Verification

- Full uncached units with all Auth/IAM DB/Redis opt-ins: API 107 suites / 557 tests,
  Web 59 tests and Worker 36 tests pass.
- Authorization/Audit real E2E: two suites / 11 tests pass.
- Changed source formatting and diff checks pass. Lint, typecheck, Prisma
  validation, build and architecture/license checks pass. Thirty architecture
  tests pass; the reviewed baseline remains 135 known D4 findings, none waived.
- Initial fixture failures (required role timestamp and a mistyped permission key)
  were corrected, not bypassed. The single unused typo permission fixture was
  removed by exact ID after verifying no assignments; no user data was removed.
- Root formatting was rerun and fails on the same 41 legacy files; changed files
  pass. Dependency audit, full E2E and generated consistency remain
  known baseline acceptance debts. No red-check merge is permitted.

## Remaining D3.5 scope

Approve and implement generic group membership/periods, closed delegation and
Guardian capability contract separately. This increment does not satisfy that
entire exit gate or authorize Phase 11 implementation.
