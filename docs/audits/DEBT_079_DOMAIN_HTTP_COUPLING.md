# DEBT-079 — Domain exceptions inherit Nest HTTP transport

Date: 2026-10-23. Baseline: accepted main `f118d82`.
Severity: Medium. Status: OPEN; design/correction not approved.

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
