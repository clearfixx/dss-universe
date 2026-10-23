# DEBT-040 — REST validation compatibility

Status: characterization complete; correction/acceptance pending.
Branch: `debt/debt-040-validation-contract`, from accepted main `f118d82`.
Owner approved compatibility and HTTP evidence before correction. D7 runtime
changes remain excluded; Next/Mailpit authority is separate.

## Fresh evidence

- Fresh `pnpm --filter @dss/api build` passes. Built controller body metadata is
  Function for register/login/refresh.
- `node scripts/audit-auth-rest-metadata.cjs` passes its pre-correction assertions:
  three loopback HTTP requests using valid synthetic DTO-shaped bodies receive
  400 unknown-value before presentation is invoked. Actual compiled controller,
  actual Nest HTTP/pipe options; only downstream presentation is doubled. No
  AppModule, real authentication, DB, Redis or mail is started.
- Actual Jest characterization passes3/3: the same controller's body metadata is
  Object, and the configured pipe skips DTO validation. It accepts the synthetic
  unknown field unchanged. This explains why accepted E2E outcomes cannot certify
  this built-controller boundary; both E2E and production use the same strict
  pipe options.
- A separate TypeScript transpileModule probe produces Object for both effective
  module-option sets. Do not blame CommonJS versus NodeNext alone; the actual
  emitted production/Jest difference is the authoritative observation.

The diagnostic's successful exit proves a defect characterization, not a working
login endpoint. These assertions must be replaced with intended DTO behavior as
part of correction; do not preserve a test requiring broken metadata forever.

## Compatibility decision requested

Root registration composition accepts optional displayName. REST and GraphQL
decorated DTOs currently require it. Proposed correction retains optional REST
displayName with nonempty-string validation when present; GraphQL remains
required. Owner confirmation is pending. No value-import/decorator correction
has been made yet. Successful response allowlists, status codes and Auth/Users
ownership remain unchanged.

After agreement: explicit runtime DTO imports, constructor/validation assertions,
built-controller HTTP positive/negative regressions, real API regressions and full
quality/security/CI. Current dependency security is still a separate blocker;
this checkpoint is not a completed package, PR acceptance or permission to merge.

## Regression scope before correction

| Boundary         | Required evidence                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime metadata | Jest and fresh production build both identify the concrete request DTO constructor for each REST operation.                                                                                     |
| Register         | Valid request reaches composition unchanged except normal whitelist filtering; required email/username/password validation rejects malformed inputs before it. displayName policy awaits owner. |
| Login            | Valid email/password and omitted factor reach composition; malformed optional factor/type/short password are rejected. No change to factor ownership or authentication decisions.               |
| Refresh          | String payload reaches composition; missing/non-string payload rejected. Do not add GraphQL's MinLength to REST implicitly: empty-string REST authentication denial remains a service concern.  |
| Unknown fields   | Global whitelist filters undecorated fields without inventing forbidNonWhitelisted or changing global pipe settings.                                                                            |
| Response         | Existing register/login/refresh success statuses, explicit profile/token fields and error ownership stay intact.                                                                                |
| Failure ordering | Validation rejects before the controlled presentation boundary; production-controller diagnostic must also demonstrate valid calls reach it after correction.                                   |

The downstream HTTP double can prove validation/dispatch, not token issuance,
credential correctness or DB/session atomicity. Those remain real API integration
regressions, not claims inferred from synthetic responses. Characterization tests
pinning Object/Function must become corrected-contract tests before acceptance.

Fresh characterization-branch checks: architecture140/140 with zero bounded
findings, API lint and API typecheck all exit0. Formatting/diff checks pass for
the authored diagnostic/tests/report. These checks do not substitute for the
pending correction's full gate or remove the separate Next security blocker.
