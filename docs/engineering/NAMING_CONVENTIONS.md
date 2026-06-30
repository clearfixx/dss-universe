# DSS Universe • Naming Conventions

> Version: 1.0
> Status: Approved
> Applies to: Entire DSS Universe platform

---

# Purpose

Naming is one of the most important parts of software architecture.

Good names reduce documentation.

Bad names create technical debt.

Every name in DSS Universe should clearly communicate its responsibility.

---

# General Principles

A name should answer:

> "What responsibility does this thing have?"

Avoid names that describe implementation details.

Prefer names that describe business responsibility.

---

# Files

Use kebab-case.

Good:

```txt
users.service.ts
users-query.repository.interface.ts
safe-user.type.ts
user.mapper.ts
```

Avoid:

```txt
UsersService.ts
UserService.ts
helper.ts
common.ts
utils.ts
```

---

# Classes

Use PascalCase.

Examples:

```txt
UsersService

UserMapper

JwtAuthGuard

PrismaUsersQueryRepository

ResourceNotFoundException
```

---

# Interfaces

Repository contracts should describe responsibility.

Good:

```txt
UsersQueryRepository

UsersMutationRepository
```

Avoid unnecessary prefixes:

```txt
IUsersRepository
IMapper
IService
```

Interfaces should read naturally.

---

# Services

Services coordinate business operations.

Naming:

```txt
UsersService

ForumService

NotificationsService
```

Avoid:

```txt
UserManager

UsersLogic

UsersBusiness
```

The word "Service" already communicates the responsibility.

---

# Repositories

Repository names should describe what they do.

Contracts:

```txt
UsersQueryRepository

UsersMutationRepository
```

Implementations:

```txt
PrismaUsersQueryRepository

PrismaUsersMutationRepository
```

Future examples:

```txt
RedisSessionRepository

S3FileStorageRepository
```

Implementation technology belongs only in implementation names.

---

# Controllers

Controllers expose HTTP endpoints.

Naming:

```txt
UsersController

ForumController

AuthenticationController
```

Avoid:

```txt
UsersApi

UsersRoutes

UsersEndpoint
```

---

# DTOs

Always describe purpose.

Examples:

```txt
CreateUserDto

UpdateProfileDto

LoginRequestDto

LoginResponseDto
```

Avoid:

```txt
UserDto

DataDto

ResponseDto
```

---

# Exceptions

Exception names should describe the problem.

Examples:

```txt
UserNotFoundException

RoleAlreadyExistsException

PermissionDeniedException
```

Avoid:

```txt
UserException

GeneralException

ErrorException
```

---

# Constants

Constant names should describe meaning.

Examples:

```txt
USER_ERRORS

AUTH_ERRORS

DEFAULT_PAGE_SIZE
```

Avoid:

```txt
VALUES

CONFIG

DATA
```

---

# Types

Types should describe the represented concept.

Examples:

```txt
SafeUser

PaginationOptions

PaginatedResult

AuthenticatedUser
```

Avoid:

```txt
Data

Info

Item

Object
```

---

# Value Objects

Value objects should be named as domain concepts.

Examples:

```txt
EmailAddress

UserId

DisplayName

Slug
```

Avoid implementation names.

---

# Mappers

Mapper names should describe what they map.

Examples:

```txt
UserMapper

ForumMapper

LessonMapper
```

Avoid:

```txt
Mapper

EntityMapper

DataMapper
```

---

# Guards

Examples:

```txt
JwtAuthGuard

PermissionsGuard

RolesGuard
```

---

# Decorators

Decorator names should read naturally.

Examples:

```txt
Authenticated

AuthUser

Permissions

CurrentLocale
```

---

# Modules

Modules represent business capabilities.

Examples:

```txt
UsersModule

ForumModule

AcademyModule
```

---

# Variables

Variables should express intent.

Good:

```ts
currentUser
permissions
isOwner
createdUser
forumTopic
```

Avoid:

```ts
data
obj
item
tmp
value
result2
```

Temporary names should exist only for a few lines.

---

# Boolean Variables

Booleans should read like questions.

Examples:

```txt
isActive

isOwner

hasPermission

canEdit

shouldNotify
```

Avoid:

```txt
active

permission

owner
```

---

# Functions

Function names should start with a verb.

Examples:

```txt
createUser

findByEmail

updateProfile

assignRole

generateToken
```

Avoid:

```txt
user

profile

token
```

---

# Folder Names

Folders describe responsibilities.

Good:

```txt
repositories

controllers

exceptions

constants

mappers
```

Avoid:

```txt
helpers

misc

stuff

common

temp
```

---

# Abbreviations

Avoid abbreviations unless universally understood.

Allowed:

```txt
DTO
JWT
API
URL
UUID
ID
HTTP
OAuth
```

Avoid:

```txt
Cfg
Mgr
Usr
PermSvc
```

---

# Public API

Public names should be stable.

Changing a public name is a breaking architectural change.

Choose names carefully.

---

# Final Rule

A developer should understand what something is before opening the file.

If a name requires explanation, choose a better name.
