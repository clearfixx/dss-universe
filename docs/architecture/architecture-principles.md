# DSS Universe — Architecture Principles 🚀

## Module First

Every major business capability lives in its own module.

Examples:

```txt
auth
iam
users
forum
academy
cms
blog
Explicit Is Better Than Implicit

Prefer clear contracts, explicit exports, and visible boundaries.

Magic is cute until production is on fire.

Security First

Authorization must be enforced on the backend.

Frontend may hide buttons, but backend decides access.

Permissions Are the Source of Truth

Roles describe groups of permissions.

Permissions decide what is allowed.

Thin Controllers, Rich Services

Controllers route requests.

Services make decisions.

Database Is Not the Brain

The database stores state.

Business rules live in application services.

Feature Isolation

Modules should communicate through public exports, not deep internal imports.

Build for 3000 Files

Every decision should still make sense when the project has thousands of files.

If it will become painful later, fix the idea now.
```
