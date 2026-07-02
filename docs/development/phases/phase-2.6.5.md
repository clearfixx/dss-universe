# Phase 2.6.5 — Architecture Standardization

## Status

Completed.

## Summary

Phase 2.6.5 started as a small Current User API refinement phase, but evolved into an important backend architecture standardization phase.

The main goal became aligning Users, Authentication, and Authorization around a consistent DSS layered architecture before the project grows into larger modules such as Avatar, Forum, CMS, Academy, and AI Core.

## Main Results

### Users Module

The Users module became the current reference implementation for backend module architecture.

Completed:

- aligned `UserRecord`, `SafeUser`, and `UserResponseDto`;
- removed authentication secrets from `SafeUser`;
- synchronized user profile foundation fields with Prisma schema;
- added migration for profile foundation fields;
- added response mapper alignment;
- added Users Folder Passport.

Architecture flow:

```txt
UserRecord
  ↓
UserMapper
  ↓
SafeUser
  ↓
UserResponseMapper
  ↓
UserResponseDto
Authentication Module

Authentication was moved from a flat structure into layered architecture.

New structure:

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

Completed:

moved DTOs into application/dto;
moved services into application/services;
moved auth constants and exceptions into domain;
moved controller into presentation/controllers;
added Auth Folder Passport;
fixed imports after restructuring.
Authorization Core

Authorization Core became the owner of user access profile loading.

Before:

TokenService
  ↓
Prisma

After:

TokenService
  ↓
PermissionsService
  ↓
PermissionsRepository
  ↓
Prisma

Completed:

removed direct Prisma access from TokenService;
added UserAccessProfile;
added access profile loading to PermissionsRepository;
exposed authorization access profile through PermissionsService;
exported the new type from Authorization Core public API.
Key Architecture Decisions
Authentication is not Authorization

Authentication owns:

registration;
login;
refresh;
logout;
password hashing;
token issuing.

Authorization owns:

roles;
permissions;
effective access profiles;
permission guards.
SafeUser must be actually safe

SafeUser must never contain:

passwordHash;
refreshTokenHash;
future authentication secrets.
Prisma stays behind infrastructure/repository boundaries

Application services should not depend directly on Prisma.

Exception cases must be reviewed deliberately.

Folder Passports are required for important modules

Users and Auth now have module-level README files that explain ownership, structure, and rules.

Commits
refactor(users): align user response model
refactor(auth): align layered architecture
Build Verification
pnpm --filter @dss/api build

Build passed after all changes.

Final Result

Phase 2.6.5 established a stronger backend foundation.

Users is now the reference module.

Auth follows layered architecture.

Authorization owns access profile resolution.

DSS backend architecture is now ready for Phase 2.6.6.
