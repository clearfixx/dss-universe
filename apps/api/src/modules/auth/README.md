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

## Transitional response/registration flow

```txt
AuthController
  ↓
AuthService
  ↓
UsersRepository
  ↓
UserRecord
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
UsersRepository/UserMapper dependencies above remain transitional D3.2 debts,
not the target registration/presentation architecture.

Do not access Prisma directly from Auth application services.

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
