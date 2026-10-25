# DEBT-040 — REST validation compatibility

Status: scoped correction implemented; full verification/review/acceptance pending.
Branch: `debt/debt-040-validation-contract`, from accepted main `f118d82`.
Owner approved compatibility and HTTP evidence before correction. D7 runtime
changes remain excluded; Next/Mailpit authority is separate.

## Pre-correction evidence (characterization399dcc7)

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

## Approved compatibility and correction

The owner confirmed optional REST displayName and unchanged required GraphQL
displayName. REST now validates supplied values as nonblank strings; null and
non-string values are rejected, omission is accepted. Runtime named DTO imports
restore concrete metadata without changing the global pipe. GraphQL source is
unchanged. Successful response allowlists, status codes and Auth/Users
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
pinning Object/Function have become corrected-contract tests.

## Corrected evidence

- Red-to-green unit regression:5 failed/12 passed before correction, then17/17
  passed. Concrete constructor identity, REST omission/nonblank validation,
  whitelist, unchanged required GraphQL and REST empty refresh behavior covered.
- Fresh production build passes; built-controller loopback HTTP now verifies
  concrete RegisterDto/LoginDto/RefreshTokenDto,5 valid dispatches and11 invalid
  requests rejected before the presentation double. DTO optional undefined
  properties are compared by JSON wire shape; unknown properties must be absent.
- Real AppModule/owned migrated schema HTTP suite14/14; actual registration,
  hashing, login and refresh are not doubled. Combined with complete existing
  app suite:41/41 passed, no test selection/skips inferred. JSON retained at
  `node_modules/.cache/debt040-auth-regressions.json`.
- API typecheck after source/new E2E changes passes. Corrected lint/architecture,
  zero-warning changed-file lint and architecture140/140 pass; no merge claimed.

## Consolidated gate and automation checkpoint

`quality:full` with disposable5434/Redis6380 exits1 at security:check. Before it:
format, architecture140/140, Prisma validate/generate/read-only empty drift,
workspace lint/typecheck, full-policy40/40, quality-policy5/5 and security-policy9/9
pass. Exact braces verification/regressions14/14 pass; three Next advisories
still block. Subsequent coverage/full E2E/codegen/build/browser steps were not
executed by that attempt. Separately reported41 HTTP cases are diagnostics,
not a passing consolidated gate. Raw log:
`C:/Users/admin/AppData/Local/Temp/dss-debt040-quality-full.log`, SHA256
`E06CA933FFAA04BC6A0EEC388CE11C0385C9E8F9FFC0433D6C39A5FA0CB46391`.

After that terminal attempt, added the built REST diagnostic to the existing
`test:api-build-entry` command via a bounded child-process test. Existing CI and
full runner already invoke this after production build; no workflow triggers,
timeouts, checks or audit policies were weakened. Separate post-build command
passes2/2. This final wiring was not part of the earlier consolidated attempt;
the complete final-head gate/CI still must pass after dependency remediation.
GraphQL SDL/generated-client tracked diff remains empty. Owned HTTP fixture
cleanup verified zero api*boundary* schemas.

Fresh characterization-branch checks: architecture140/140 with zero bounded
findings, API lint and API typecheck all exit0. Formatting/diff checks pass for
the authored diagnostic/tests/report. These checks do not substitute for the
pending correction's full gate or remove the separate Next security blocker.
