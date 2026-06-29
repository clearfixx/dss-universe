# DSS Universe — Engineering Rules 🛰️

## 1. Keep the Build Green

After every meaningful change, the project should return to:

```txt
Found 0 errors

Do not stack new work on top of a broken build unless the breakage is intentional and short-lived.

2. Read Before Refactor

Before changing an existing module, inspect its real files first.

Do not guess file names, exports, paths, or behavior.

3. Always Show Full File Paths

Every code instruction must include the full project path.

Example:

apps/api/src/modules/iam/roles/roles.service.ts
4. DSS File Passport

Every new source file should start with a DSS File Passport.

/**
 * DSS File Passport 🛰️
 * File:
 * Purpose:
 * Phase:
 * Architecture:
 *
 * Notes:
 * - Optional.
 * - Small jokes are allowed.
 */
5. Controllers Stay Thin

Controllers may receive input, call services, and return responses.

Controllers must not contain business logic.

6. Services Own Business Logic

Business decisions belong in services.

Services should not depend on HTTP-specific behavior.

7. No any by Default

Avoid any.

If any appears, it must be temporary, justified, and removed during cleanup.

8. DTO Required Fields Use !

Required DTO fields use definite assignment assertion.

export class CreateRoleDto {
  name!: string;
}

Do not mark required fields as optional just to silence TypeScript.

9. Permissions Over Roles

Backend authorization checks permissions, not role names.

Roles are containers for permissions.

10. No Parallel Authorization Systems

There must be one active authorization model.

Current model:

User -> UserRole -> Role -> RolePermission -> Permission
User -> UserPermission -> Permission

Do not reintroduce enum-based User.role.

11. No Circular Dependencies

Avoid forwardRef().

If it appears, treat it as an architecture warning.

12. Feature Slice Development

Prefer complete vertical slices:

DTO -> Service -> Controller -> Route -> Test

over many half-finished layers.

13. Architecture Guardian Rule

If a decision is fast today but harmful long-term, reject it.

DSS Universe is a platform, not a disposable demo.
