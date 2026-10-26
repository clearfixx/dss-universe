# DEBT-079 — Domain exceptions inherit Nest HTTP transport

Date: 2026-10-23. Baseline: accepted main `f118d82`.
Severity: Medium. Status: OPEN; characterization accepted, decoupling unimplemented.

## 2026-10-26 acceptance checkpoint

Owner accepted design/characterization PR93, merged into main as `a8c71fa`.
The [design and evidence](../development/DEBT_079_DOMAIN_ERROR_DESIGN.md) record
all ten constructor identities and actual public Auth/Users/Media failure paths.
Exact head `7a86b91` passed CI5/5 and local quality:full exit0: API coverage
1327/1327, strict E2E623/623, build6/6, post-build2/2, Web14/14 without retries.
Local E2E SHA256: `6B59FA5D1DB9B0C937C5611F0D05F7DF135C22D96FC3D737A2300F90FE48A528`.

Owner separately approved correcting locked-login GraphQL mapping to
RATE_LIMITED/statusCode429, preserving HTTP200/message/abuse behavior. Separate
runtime PR94 is still under verification and is not accepted or merged. This
narrow mapping does not remove Nest inheritance from Domain.

The original inventory below remains historical evidence. Its request for
initial design authorization is superseded by the accepted characterization;
the remaining Domain/presentation separation still requires detailed design and
separate implementation approval. D7 and Phase11 are not accepted by this update.

## Current evidence

Ten non-test files under feature `domain/exceptions` import `@nestjs/common`
and inherit HTTP exceptions or use HTTP status constants:

| Owner | Files                                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth  | `invalid-credentials.exception.ts`, `email-already-exists.exception.ts`, `two-factor-required.exception.ts`, `login-rate-limited.exception.ts`                                              |
| Users | `user-not-found.exception.ts`                                                                                                                                                               |
| Media | `avatar-media-forbidden.exception.ts`, `cover-media-forbidden.exception.ts`, `invalid-avatar-media.exception.ts`, `invalid-cover-media.exception.ts`, `media-access-forbidden.exception.ts` |

Source roots are `apps/api/src/modules/<owner>/domain/exceptions/`. Direct
imports and class inheritance were inspected, not inferred from filenames.
Examples: Auth InvalidCredentialsException extends UnauthorizedException;
LoginRateLimitedException extends HttpException with TOO_MANY_REQUESTS;
Media InvalidAvatarMediaException extends BadRequestException.

Comparison of all three domain directories against the accepted D5 baseline
`fcab53c` shows no source changes in D6. D7 has changed no runtime source.
This is inherited coupling, not a new D6/D7 runtime regression.

## Rule and impact

[Architecture rules](../architecture/ARCHITECTURE_RULES.md) require a Domain
independent of NestJS/HTTP and transport error conversion outside Domain.
Current exceptions bind domain-level code to framework/transport behavior.
This confirms an architectural dependency, not an authentication bypass,
data disclosure or incorrect current HTTP response.

The architecture inventory explicitly does not certify framework-free Domain;
its zero finding count cannot close this concern. No analyzer finding or
approved baseline was hidden, expanded or reclassified as an exemption.

## Separate scope to agree

First determine which classes represent domain failures and which are transport
adapters. Design narrow conversion at the appropriate boundary, preserving
status codes, public messages, rate-limit behavior and GraphQL error semantics.
Require focused unit and actual HTTP/GraphQL regressions before correction.
Do not close the debt by merely renaming folders, adding a broad exemption or
loosening the architectural principle. No runtime change is authorized by D7.
