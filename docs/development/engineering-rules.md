# DSS Universe — Engineering Rules 🛰️

## Purpose

This document defines the engineering rules used while building DSS Universe.

These rules exist to keep the project consistent, maintainable, and safe as it grows from a small codebase into a real platform.

---

## 1. Module First

Every major business capability should live in its own module.

Examples:

- `auth`
- `iam`
- `users`
- `forum`
- `academy`
- `cms`
- `blog`

Avoid dumping unrelated logic into generic folders like `utils`, `shared`, or `common` unless the responsibility is truly cross-cutting.

---

## 2. Explicit Exports

Every meaningful folder should expose its public API through `index.ts`.

Prefer:

```ts
import { RolesService } from './roles';

Avoid:

import { RolesService } from './roles/roles.service';

Folders should decide what they expose.

3. Thin Controllers

Controllers should stay thin.

They may:

receive requests;
validate input through DTOs;
call services;
return responses.

They must not contain business logic.

4. Services Own Business Logic

Business rules belong in services.

If a controller starts making decisions, move that logic into a service.

5. DTO Required Fields Use !

Required DTO fields should use definite assignment assertion.

Example:

export class CreateRoleDto {
  name!: string;

  label!: string;

  description?: string;
}

Do not mark required fields as optional only to satisfy TypeScript.

6. DSS File Passport

Every new source file should begin with a DSS File Passport.

Example:

/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/example/example.service.ts
 * Purpose: Explains what this file owns.
 * Phase: Current phase name
 * Architecture: Module/service/controller/etc.
 */

Light jokes and emojis are allowed when they do not make the code noisy.

7. Full File Paths in Code Instructions

When writing or replacing code, always include the full project path before the code block.

Example:

apps/api/src/modules/iam/roles/roles.service.ts

This avoids confusion when several files have similar names.

8. Read Before Refactor

Before changing an existing module, inspect its current files first.

Do not guess filenames, exports, folder structure, or existing behavior.

For example, before refactoring auth, inspect:

Get-ChildItem apps/api/src/modules/auth -Recurse
Get-Content apps/api/src/modules/auth/auth.service.ts

Architecture decisions must be based on real project state, not memory.

9. No Parallel Authorization Systems

DSS must not keep multiple competing role/permission systems.

There should be one active source of truth for authorization.

Current direction:

User
  -> UserRole
  -> Role
  -> RolePermission
  -> Permission

Direct user permissions are handled through:

User
  -> UserPermission
  -> Permission

Avoid reintroducing enum-based User.role.

10. No Blind Compatibility Layers

Temporary compatibility code is allowed only when clearly marked and scheduled for removal.

If a compatibility layer starts becoming permanent architecture, stop and refactor.

11. No Circular Dependencies by Default

Avoid forwardRef() unless there is a strong reason.

If forwardRef() appears, treat it as an architecture warning, not a normal solution.

12. Guards Protect, Services Decide

Guards should answer access questions.

Services should own business decisions.

Do not put domain business logic into guards.

13. Feature Slice Development

When possible, build features vertically:

DTO
  -> Service
  -> Controller
  -> Route
  -> Test

Prefer a complete small feature over many half-finished layers.

14. Keep the Build Green

After meaningful changes, return to:

Found 0 errors

Do not continue stacking changes on top of a broken build unless the breakage is intentional and short-lived.

15. Architecture Guardian Rule

If a decision is fast today but harmful long-term, reject it.

DSS Universe is being built as a platform, not a disposable demo.


Після створення:

```powershell
git status
