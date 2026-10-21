# Identity composition

This root-owned integration area combines explicit Auth, Users and Authorization
contracts. Feature applications must not import it. The root AppModule installs
its bindings; only the narrow Auth-owned token is global, avoiding an Auth ↔
composition Nest module cycle.

The legacy access-token adapter preserves username/roles/permissions in existing
JWTs. Auth supplies only opaque ID, email and access version. Users publishes a
username-only read contract; Authorization remains the access-claim authority.
No credentials, ORM records, positive eligibility cache or database clients
cross these ports. Missing authority fails token issuance.

IdentityPresentationModule now installs the existing profile-bearing REST and
GraphQL operations. AuthenticationPresentationService coordinates opaque Auth
flows and the Users-owned sixteen-field ViewerProfileReader. No feature imports
composition. AuthModule no longer imports Users or private profile mappers.

Registration binds a profile to a trusted Auth-owned write-only credential store.
PrismaRegistrationTransaction commits the shared identity/profile row and the
IAM-owned baseline role atomically; only the subject ID returns. This narrow
infrastructure capability receives a password hash for persistence, never as
a profile or business response. Prisma never crosses its application contract.
Sessions are created after commit; verification mail remains best-effort.

Auth and Users own the allowlisted enrollment fragments published through their
guarded infrastructure entries. IAM's stateless registration role writer owns
baseline lookup and assignment. Root alone owns the shared physical INSERT and
transaction lifetime, preserving lookup → subject → assignment ordering.

Presentation failure returns no combined success/token pair. It does not undo
an already committed account, created session or refresh rotation. This is not
a distributed transaction or a guarantee of automatic retry after refresh failure.
See the D3 registration/presentation evidence for exact gates and remaining debts.
