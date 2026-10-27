# DEBT-079 — Owner failure runtime boundaries

Date: 2026-10-27. Accepted implementation base: `f9ddeeb`.
Owner explicitly approved this separate runtime package after accepting the
[detailed design](DEBT_079_OWNER_FAILURE_BOUNDARY_DESIGN.md). This is not D7,
stack-audit or Phase11 acceptance.

## Implementation scope

Ten private owner classes now extend ordinary Error with their stable identity,
name and message. They have no Nest imports, HTTP statuses or response methods.
No business application service, transaction, rule, credential store or queue
was changed. MediaUploadPolicyException remains outside the ten-class scope.

| Owner | Private failures                                                                                       | Presentation conversion                                            |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Auth  | InvalidCredentials, EmailAlreadyExists, TwoFactorRequired, LoginRateLimited                            | Owned `mapAuthFailure`; named export only from Auth presentation   |
| Users | UserNotFound                                                                                           | Owned `mapUsersFailure`; remains internal to Users presentation    |
| Media | AvatarMediaForbidden, CoverMediaForbidden, InvalidAvatarMedia, InvalidCoverMedia, MediaAccessForbidden | Owned `mapMediaFailure`; named export only from Media presentation |

Mappers recognize actual private class instances, never a name, message or
untrusted status field. Unknown values and existing Nest exceptions retain exact
identity. Known failures receive only their existing client envelopes; the
accepted rate-limit429 response retains its intentional lack of an `error`
field. Avatar/cover eligibility-specific text is preserved.

Root identity REST/GraphQL entry points use the published Auth mapper after
awaiting the complete composition operation. Root profile-assets uses the
published Media mapper. Local Auth credential mutations, 2FA disable, Media
access and Users lookup/update/profile-completion paths map their own failures.
Root and local feature application providers remain unchanged; business ports
are not rebound to transport wrappers. No private failure class is exported to
another feature or root production code.

Refresh retains its existing uniform401 normalization. Other unknown failures
remain internal errors rather than being disguised as invalid credentials.
DTOs, GraphQL models/schema, guards and the global formatter are unchanged.

## Deterministic evidence and regression boundaries

- Pure-domain RED:12/12 existing constructor cases failed on inherited Nest
  identity before the correction. Report: `node_modules/.cache/debt079-pure-domain-red.json`.
- Placement RED: after domain conversion but before presentation wiring, all8
  real Users/Media transport cases lost their expected public status/code.
  Report: `node_modules/.cache/debt079-presentation-placement-red.json`.
- First GREEN:48 domain/mapper cases and27 real transport cases passed after
  wiring. Static source-import enforcement was added afterward.
- Current focused unit cohort:198/198 across12 suites, including76 awaited
  entry-point cases, all ten domain identities, exact mapper envelopes, spoofed
  failures, unknown identity, existing owner services and refresh composition.
  Report: `node_modules/.cache/debt079-focused-units.json`.
- Expanded real HTTP suite:18/18. Known denial cases use real authentication,
  password verification and migrated DB state. They cover local credential
  mutations, duplicate email, 2FA proof denial with unchanged credential state,
  public Users lookup, avatar/cover eligibility and private Media visibility.
  Report: `node_modules/.cache/debt079-expanded-transport.json`.
- Explicit fault-injection cases separately verify production-mode formatter
  redaction, existing known404 visibility, unknown REST500/GraphQL internal
  errors and refresh uniform401 after profile infrastructure rejection. These
  use actual HTTP transport with controlled application failures; they do not
  claim to prove business authorization or a production deployment bootstrap.
- Three new mapper files have100% branches/functions/lines/statements thresholds.
  Five older Media application assertions now check their exact domain identity;
  presentation/HTTP suites retain exact400/403 envelopes and messages. Rejected
  assignments still assert that no persistence command executes.

Architecture checks pass with the existing frozen baseline and no exemptions;
the ten source files are checked for parsed Nest imports. No wildcard export,
shared exception registry, dependency, schema/migration or frontend changes.

## Pending acceptance

Full format/lint/typecheck/coverage, strict E2E, Prisma drift/validation,
GraphQL consistency, build/post-build, no-retry Web smoke and exact-head CI
remain required. Focused evidence does not substitute for that gate. Owner
acceptance/merge and DEBT-079 closure are not claimed by this checkpoint.
