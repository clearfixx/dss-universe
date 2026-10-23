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
