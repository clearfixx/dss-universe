# DSS Universe — Naming Conventions ✨

## Files

Use kebab-case.

```txt
roles.service.ts
roles.controller.ts
create-role.dto.ts
user-access.service.ts
Classes

Use PascalCase.

RolesService
CreateRoleDto
UserAccessController
DTOs
create-entity.dto.ts
update-entity.dto.ts
grant-user-role.dto.ts
Services
feature.service.ts

Example:

roles.service.ts
permissions.service.ts
Controllers
feature.controller.ts
Types
entity-summary.type.ts
entity-with-relations.type.ts
Role Names

Role names are lowercase identifiers.

user
moderator
admin
owner
blog_editor

Never:

ADMIN
User
SuperAdmin
Permission Keys

Permission keys use dot notation.

users.read
roles.create
permissions.manage
blog.create
