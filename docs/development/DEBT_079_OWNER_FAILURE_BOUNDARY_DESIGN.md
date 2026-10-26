# DEBT-079 — Detailed owner failure boundaries

Date: 2026-10-26. Accepted baseline: main `a8c71fa` (characterization PR93).
Owner approved detailing this direction, not implementation. Rate-limit mapping
is separately approved in PR94; its acceptance remains independent.

## Required outcome

The ten inventoried classes become owner-local ordinary Error subclasses with
no Nest import, HTTP status or transport response methods. Preserve their
existing identities, stable messages and optional avatar/cover eligibility text.
No feature imports another feature's failure implementation. Application failure
propagation and ordering remain unchanged; presentation converts only known
owner failures. No new tables, global exception registry or shared failure base.

## Minimize public failure surface

Do not export all ten domain classes simply to let root discriminate them.
Prefer explicit owner-owned presentation mappers that recognize private failures
inside their owner and return the established transport error. Root presentation
imports only the named Auth/Media presentation mapping capabilities needed for
its composition operations; Users conversion remains local unless an actual
cross-owner entry point requires it. Existing Users presentation exports establish
that root can consume explicit presentation contracts without feature coupling.

The mapper input is unknown. Recognized owner failures receive exact allowlisted
HTTP envelopes; unknown values, including existing Nest errors and infrastructure
failures, are returned unchanged and rethrown unchanged by the caller. Do not
duck-type by message, class name or a user-controlled code field. No mapper may
inspect credentials, profiles, repositories or permission state.

If implementation inspection demonstrates a business port genuinely needs a
public failure identity, publish only that owner's minimal named pure contract
and document the consumer. Do not introduce transport conversion into that port
or publish broad services to avoid designing the boundary.

## Conversion placement

| Entry point                                                  | Failure ownership     | Conversion boundary                                                                  |
| ------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------ |
| Root identity REST/GraphQL registration, login, reactivation | Auth                  | Root presentation invokes the Auth-owned presentation mapper                         |
| Root identity refresh                                        | Auth/root composition | Preserve existing uniform401 normalization, including profile infrastructure failure |
| Auth local GraphQL email/password/deactivation operations    | Auth                  | Auth presentation boundary                                                           |
| Auth local GraphQL two-factor disable/login-proof failures   | Auth                  | Auth presentation boundary                                                           |
| Users profile lookup and other requireUser consumers         | Users                 | Users presentation boundary                                                          |
| Root setViewerAvatar/setViewerCover                          | Media                 | Root presentation invokes Media-owned presentation mapper                            |
| Media mediaAccessUrl                                         | Media                 | Media presentation boundary                                                          |

Inspect every call site, including local controllers and composition providers,
before implementation. Do not attach a filter only to AuthModule and assume it
catches root resolvers. Current AUTHENTICATION_FLOWS binds directly to AuthService;
changing that binding to a transport wrapper would contaminate a business port.
Prefer presentation conversion after application effects/rollback handling.

Async presentation must await the application promise inside its conversion
boundary, otherwise rejection can escape the catch. DTOs and GraphQL models
remain data declarations; no error conversion or business rules belong there.

## Exact compatibility rules

- Structured envelopes keep status/message/error for the nine existing cases.
- Locked login uses separately approved PR94 semantics: REST429 without a new
  error field; GraphQL HTTP200 with RATE_LIMITED/statusCode429 and unchanged text.
  Do not reintroduce the old INTERNAL_SERVER_ERROR while removing inheritance.
- Preserve failed-login accounting before rethrow, including the distinction
  between missing and supplied-invalid second-factor proof. No new accounting
  in presentation and no changed recovery-code consumption transaction.
- Refresh's intentional catch-all denial remains401; other operations must not
  silently start applying that normalization to unknown failures.
- Preserve guard precedence, profile read ordering, registration rollback and
  no-token-on-missing-profile behavior. No additional database access in mappers.
- Keep public error extensions minimal; stack, causes, credentials, file paths,
  secret material and internal state must not be added to public payloads.

## Verification required before implementation acceptance

1. Domain tests assert plain Error identity/message, not Nest getStatus/getResponse.
2. Each owner mapper tests every known identity and relevant custom text, plus
   exact unknown-object/Error identity propagation. Existing Nest errors must
   remain unchanged, not accidentally receive a different status.
3. Root/local presentation tests prove mapping placement and async rejection
   handling; preserve existing refresh uniform-denial negative controls.
4. Re-run actual transport characterization across all ten failure identities
   on fully migrated private schemas, including unchanged successful operations.
5. Cover production formatter redaction and unknown-error paths separately from
   known client failures. Do not infer these from constructor tests.
6. Confirm no Nest/HTTP imports in the ten domain classes and no direct private
   cross-owner imports, without expanding architecture exemptions/baselines.
7. Full quality gate, strict E2E completeness, generated GraphQL diff, build and
   Web smoke must pass on the exact integration head. No timeout increases,
   sleeps, retry-to-green, weakened assertions or silent API changes.

## Scope boundaries and pending decisions

This design does not migrate every existing Nest decorator/exception from all
application services. It closes only the inventoried ten Domain dependencies and
their necessary presentation paths. MediaUploadPolicyException already extends
Error and remains unchanged unless a concrete regression requires separate scope.
Actual mapper names/files and exhaustive consumer inventory must be checked in
the implementation plan. No runtime source has changed in this design package.

## Consumer inventory checkpoint

Bounded static scan of non-test API sources confirms the ten failures are thrown
by AuthService, LoginAbuseProtectionService, TwoFactorService, UsersService,
AvatarService, CoverService and MediaAccessService. This is not a dynamic-call
or whole-repository proof; implementation must also run the existing module and
composition boundary tests.

- AuthService.enroll and completeRegistration feed root registration. Login and
  reactivateAccount include abuse checks and two-factor error handling; their
  private issueAuthResponse can also reject a subject. Preserve the whole awaited
  use-case boundary rather than mapping only the initial credential lookup.
- AuthService.refresh already catches failures and throws invalid credentials;
  root refresh additionally normalizes profile-composition failures. Preserve
  both existing denial semantics without making a generic rule for other flows.
- Auth local changeEmail, changePassword and deactivateAccount can reach invalid
  credentials; changeEmail additionally reaches email conflict. The private
  requireActiveUserWithPassword path must remain covered by those entry points.
- TwoFactorService.assertLogin is reached through login/reactivation, whereas
  disable is reached through TwoFactorResolver. Mapping only root login would
  miss the local disable mutation. Begin/confirm's pre-existing Nest bad-request
  errors are not among the ten and must pass through unchanged.
- Users requireUser feeds profile lookup and update. ProfileCompletionService
  also calls UsersService.getById: include its resolver route in Users conversion,
  not just userByUsername/viewer. No cross-owner consumer of getByEmail or
  getByUsername was found by this bounded static call scan.
- MediaProfileAssetCommands is assembled from AvatarService/CoverService and
  consumed by root profile-assets. MediaAccessService.issue is reached through
  MediaResolver.mediaAccessUrl. Existing NotFoundException for a missing asset
  or variant is outside the ten and must retain its current behavior.

These indirect paths are why tests must assert mapper placement as well as the
ten constructor cases. Do not add conversion inside application orchestration
merely to avoid covering the corresponding presentation operation.

## Existing behavior baseline

On this accepted-main-based design branch, five existing unit suites pass28/28:
identity authentication presentation, profile-asset presentation, avatar, cover
and media access. They preserve missing/mismatched profile denial, no profile
read after command denial, explicit output allowlists, identity propagation of
profile infrastructure errors and uniform refresh denial. These use controlled
dependencies and do not prove a new mapper implementation or real transport.
No test or runtime source was changed for this baseline. The design Markdown
passes formatting and diff checks; its own full gate remains pending.
