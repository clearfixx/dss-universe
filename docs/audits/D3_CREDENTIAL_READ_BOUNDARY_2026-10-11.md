# D3.2 increment: Auth-owned credential reads

Date: 2026-10-11. Status: implemented increment; full D3.2 remains open.

## Boundary

`AccountCredentialsRepository` now owns credential and eligibility reads by
opaque subject ID or email. Its private read model has exactly seven fields:
`id`, `email`, `passwordHash`, `status`, `authVersion`, `loginFailedAttempts`
and `loginLockedUntil`. The Prisma adapter explicitly selects and reconstructs
this allowlist. It does not expose profile fields or legacy refresh hashes.

AuthService uses this authority for login, refresh, duplicate-email checks,
reactivation and authenticated credential commands. Database errors propagate;
there is no fallback to Users. Unknown email retains the dummy-password path.
Refresh and initial issuance use Auth's version/email rather than values from
the legacy profile row. AuthService no longer imports Prisma enums.

Users still supplies registration creation and legacy profile presentation;
username still enters existing token claims for compatibility. Those remaining
dependencies require the agreed registration/presentation composition, not a
broader credential port. No complete Auth isolation claim is made.

## Verification

- API unit tests: 341 passed, 3 skipped; 76 suites passed, 1 skipped.
- Seven selected real API E2E passed; nine unselected tests skipped.
- New adapter tests enforce exact selection, no runtime profile/hash leakage,
  missing-record behavior and error propagation.
- New service tests cover unknown email, unavailable credential authority and
  authoritative credential version despite conflicting profile version.
- Lint: nine successful tasks. Typecheck: nine successful tasks.
- Build: six successful tasks (API fresh; five cached).
- Architecture inventory decreases from 156 to 155: only the resolved
  `persistence-outside-infrastructure` finding for AuthService is removed from
  the baseline. No new finding is accepted or waived.
- All 28 architecture analyzer fixtures and Prisma validation pass.

No frontend, schema, migration or dependency changes. Existing dependency,
Web smoke, formatting and full E2E debts remain; no merge or Phase 11 start.
