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
