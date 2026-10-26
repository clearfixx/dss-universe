# DEBT-079 — Domain failure boundary design

Date: 2026-10-26. Baseline: accepted main `0bfbe2b`.
Status: design and characterization approved; runtime changes not authorized.

## Verified inventory

Ten feature-domain classes directly import Nest. Actual throw sites are owner
application services. Status below describes current transport behavior, not a
proposed domain dependency.

| Owner | Exception                     | Current status |
| ----- | ----------------------------- | -------------- |
| Auth  | InvalidCredentialsException   | 401            |
| Auth  | EmailAlreadyExistsException   | 409            |
| Auth  | TwoFactorRequiredException    | 401            |
| Auth  | LoginRateLimitedException     | 429            |
| Users | UserNotFoundException         | 404            |
| Media | AvatarMediaForbiddenException | 403            |
| Media | CoverMediaForbiddenException  | 403            |
| Media | InvalidAvatarMediaException   | 400            |
| Media | InvalidCoverMediaException    | 400            |
| Media | MediaAccessForbiddenException | 403            |

MediaUploadPolicyException already extends plain Error and is not an eleventh
Nest-coupled exception. Inspect its existing boundary as a local precedent.

## Proposed boundary

Owners retain explicit framework-independent failure identities. Owner-local
presentation adapters convert recognized failures to existing transport errors.
Unknown errors remain unknown; no generic client-error conversion or success
fallback. Root composition must not import private cross-owner failure classes:
inspect each port path before deciding whether an explicit safe outcome is needed.

No shared exception framework, global catch-all, domain HTTP constants, or folder
rename as a substitute for decoupling. Preserve successful API behavior and all
current public error messages, including custom avatar/cover eligibility text.

## Required characterization — pending

- Exact constructor response/message/status for all ten classes and custom text.
- Actual REST and GraphQL handling, separately asserting HTTP status, response
  body, GraphQL extensions and production redaction. Constructor tests alone do
  not establish a public API contract.
- Auth abuse accounting and two-factor/recovery behavior before presentation
  conversion; preserve infrastructure-failure handling and lock semantics.
- Composition entry points as well as owner-local resolvers/controllers, so a
  future pure failure cannot silently become an internal error.
- Unknown-error negative controls and absence of new sensitive payload fields.

The current GraphQL formatter maps originalError.statusCode to explicit codes
including RATE_LIMITED for 429, but falls back to the incoming extension code
when statusCode is absent. Verify the actual Nest/Apollo envelope rather than
assuming every HttpException reaches that mapping identically.

LoginAbuseProtectionService checks identity/IP counters and account lock expiry
before throwing LoginRateLimitedException. It does not itself set Retry-After;
the final HTTP boundary must be inspected before claiming header compatibility.

No runtime source, schema or policy has changed in this checkpoint. This is an
initial design inventory, not completed transport proof or debt acceptance.

## Characterization checkpoint

Constructor inventory: 12/12 cases pass (ten defaults and two explicit Media
eligibility messages); existing formatter baseline adds 2/2. Rate-limit response
is a string, unlike the other nine structured constructor responses.

Real AppModule with the existing fully migrated private-schema fixture on
disposable loopback DB5434: REST authentication suite passes 16/16, including two
new invalid-credentials cases. REST returns exactly statusCode 401, message
`Invalid email or password`, error `Unauthorized`, with no Retry-After header.
GraphQL returns HTTP200, null data, one error with that same message and exactly
extensions `{code: UNAUTHENTICATED, statusCode: 401}`.

No Auth service is mocked in these two cases. They exercise absent synthetic
accounts; they do not establish rate-limit, two-factor, conflict, Users or Media
transport behavior, production redaction, or full quality-gate acceptance.

### Locked-account transport checkpoint

The next real-AppModule fixture run passes 17/17. A newly registered synthetic
account receives an explicit lock expiry of 2099-01-01 in its owned schema;
correct-password login then returns REST429 with exactly `{statusCode: 429,
message: "Login is temporarily unavailable. Please try again later."}` and no
Retry-After header. GraphQL returns HTTP200, null data and one same-message error
with exactly `{code: INTERNAL_SERVER_ERROR}` (no statusCode extension).
Both requests preserve the lock and leave loginFailedAttempts at zero.

This confirms that constructor string-vs-object shape matters at the current
Apollo boundary: the formatter's 429 lookup alone does not prove RATE_LIMITED
is emitted. Future correction must explicitly decide whether to preserve this
inherited GraphQL contract or approve a targeted mapping change. This package
records current behavior only; it does not silently fix it, prove production
redaction, or characterize Redis-triggered rate limits.

### Duplicate-email composition checkpoint

The subsequent real-AppModule fixture run passes 18/18. Re-registering an existing
synthetic email through REST returns exactly statusCode409, message `User with
this email already exists`, error `Conflict`. The same attempt through GraphQL
returns HTTP200, null data, one same-message error with exactly extensions
`{code: CONFLICT, statusCode: 409}`. Username is distinct to avoid testing a
different uniqueness conflict. Neither rejected attempt adds a user row.
This covers the pre-existing-email path, not a concurrent unique-constraint race.

### Missing-second-factor checkpoint

Real-AppModule suite passes 19/19 with a synthetic process-local encryption key.
The test calls the real TwoFactorService.begin and enables its generated encrypted
credential in the owned fixture schema; it does not claim to test confirmation.
Correct-password login without a code returns REST401 with Unauthorized and the
exact message `A valid two-factor or recovery code is required.` GraphQL returns
HTTP200, null data and one same-message error with UNAUTHENTICATED/statusCode401.
Neither request increments loginFailedAttempts. Invalid-code and recovery-code
consumption paths remain outside this checkpoint. Reproducibility without the
explicit launcher key and the full gate remain pending.

Follow-up reproducibility run removed AUTH_2FA_ENCRYPTION_KEY from the launcher
environment and passed the same 19/19 using existing test configuration defaults.
No new environment requirement is introduced by this test. This does not replace
production key requirements or the still-pending full gate.

## Remaining owner entry points

Source inspection confirms Users `userByUsername` delegates to
UsersService.getPublicByUsername and profile projection reaches requireUser;
missing-profile characterization belongs to a Users-focused test, not an Auth
service stub. The authenticated viewer query also uses getById, but deleting its
subject may cause the session guard to reject earlier, so it is not an equivalent
missing-profile fixture.

Root profile-assets GraphQL mutations `setViewerAvatar` and `setViewerCover`
delegate through their presentation service and the Media capability. MediaModule
constructs that capability from AvatarService/CoverService: their four failure
classes are still reachable through real composition, not dead legacy code.
Media's `mediaAccessUrl` query delegates directly to MediaAccessService.issue;
its visibility check happens only after a READY delivery candidate is found.
Tests must therefore distinguish absent/non-READY media from visibility denial.
Existing media-profile cleanup fixtures demonstrate DB-only synthetic assets and
variants; transport error tests need no physical file creation or deletion.
