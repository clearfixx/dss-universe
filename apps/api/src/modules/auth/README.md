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
├── domain/
│   ├── constants/
│   └── exceptions/
├── presentation/
│   └── controllers/
├── README.md
└── auth.module.ts
Architecture Flow
AuthController
  ↓
AuthService
  ↓
UsersRepository
  ↓
UserRecord

Token issuing:

AuthService
  ↓
TokenService
  ↓
PermissionsService
  ↓
PermissionsRepository
  ↓
Prisma
Rules

Authentication verifies identity.

Authorization decides access.

Do not move permission rules into Authentication.

Do not access Prisma directly from Auth application services.

Do not store raw passwords.

Do not store raw refresh tokens.

Refresh tokens may be returned once to the client, but only hashed versions may be persisted.

Controllers must stay thin.

Current Boundary

Authentication currently owns:

registration;
login;
token refresh;
logout;
credential-confirmed account deactivation and reactivation;
credential-confirmed email and password changes;
password hashing;
JWT token issuing.

Lifecycle changes invalidate authentication immediately: refresh credentials
are cleared, durable sessions are revoked, and JWT validation requires the
current account status to remain `ACTIVE`.
Email/password rotation increments the durable authentication version, revokes
sessions and refresh credentials, and therefore invalidates every previously
issued access token.

Authorization Core owns:

roles;
permissions;
effective access profiles;
permission guards.
Notes

Authentication opens the airlock.

Authorization decides which rooms are safe to enter.

🚀 Build. Share. Grow.
```
