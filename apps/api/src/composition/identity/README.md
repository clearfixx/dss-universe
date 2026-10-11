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

Registration and combined transport response orchestration are the next D3.2
steps, not responsibilities already implemented by this token adapter. The
existing UsersRepository and UserMapper dependencies in Auth remain tracked
until those callers are migrated; this folder does not legitimize them.
