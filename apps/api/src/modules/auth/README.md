# Authentication Module Passport 🔐

## Purpose

The Authentication module owns login, registration, token refresh, and logout workflows for DSS Universe.

It verifies identity and issues tokens. It does not own authorization rules, permissions, or role policy decisions.

---

## Layer Structure

```txt
auth/
├── application/
│   ├── dto/
│   ├── services/
│   └── types/
├── contracts/
├── domain/
│   ├── constants/
│   └── exceptions/
├── infrastructure/
├── presentation/
│   └── controllers/
├── README.md
└── auth.module.ts
```

## Registration and combined presentation

```txt
Identity presentation composition
  ├─ Auth AuthenticationFlows (opaque subject ID and tokens)
  ├─ RegistrationTransaction (shared row + IAM default role, atomic)
  └─ Users ViewerProfileReader (allowlisted public presentation)
```

## Token issuing

```txt
AuthService
  ↓
TokenService
  ↓
AccessTokenIssuer (Auth-owned opaque contract)
  ↓
Identity composition adapter
  ├─ Users ProfileDisplayReader (username only)
  └─ Authorization access profile
```

## Rules

Authentication verifies identity.

Authorization decides access.

Do not move permission rules into Authentication.

The root installs IdentityCompositionModule to bind access-token issuance.
Auth supplies only subject ID, email and access version. Legacy username and
permission claims are composed outside Auth; refresh tokens contain only
subject/session/version. No positive eligibility cache is introduced.
Auth no longer imports UsersRepository/UserMapper or profile presentation.
Credential enrollment accepts a trusted write-only store and returns only an ID.
Initial session creation follows the account transaction; mail remains best-effort.
The combined REST/GraphQL operations and models live outside feature applications.

Do not access Prisma directly from Auth application services.

PasswordRecoveryService now uses the owned PasswordResetRepository port. Atomic
consumption returns only the committed notification email; rollback or denial
does not send a recovered alert. Verification and 2FA persistence
separation remains D3.3 work, not a precedent for new application ORM imports.

LoginAbuseProtectionService now delegates durable attempt counters, locking and
atomic audit to LoginAbuseRepository. Redis policy and post-commit alerts remain
application orchestration; no ORM transaction crosses the owned port. Email
Verification now uses an owned persistence port for minimal pending-destination
reads and atomic consumption/audit. 2FA likewise uses an owned port for credential
reads and locked state/audit transitions. Redis/queue capabilities remain D3.3
work. The separately approved DEBT-042 correction serializes factor mutations
under a subject lock, including first setup. Disable verifies password and factor
in the same transaction as recovery-use audit, deletion and session revocation;
audit failure cannot consume a recovery code without disabling.

Do not store raw passwords.

Do not store raw refresh tokens.

Refresh tokens may be returned once to the client, but only hashed versions may be persisted.

Controllers must stay thin.

## Current boundary

Authentication currently owns:

registration;
login;
token refresh;
logout;
credential-confirmed account deactivation and reactivation;
credential-confirmed email and password changes;
session-backed login, refresh rotation and device revocation;
password hashing;
JWT token issuing.

Lifecycle changes invalidate authentication immediately: refresh credentials
are cleared, durable sessions are revoked, and JWT validation requires the
current account status to remain `ACTIVE`.
Email/password rotation increments the durable authentication version, revokes
sessions and refresh credentials, and therefore invalidates every previously
issued access token.

Each access and refresh token carries an opaque session ID. Authentication
accepts a JWT only while that session exists, is not revoked, has not expired,
and still belongs to an active user with the matching authentication version.
Owners can list safe session metadata, revoke one session, or revoke every
other session while keeping the current device online.

Authorization Core supplies effective access profiles and permission guards.
IAM owns role/permission assignment; Auth owns neither policy nor assignments.

## Notes

Authentication opens the airlock.

Authorization decides which rooms are safe to enter.

🚀 Build. Share. Grow.
