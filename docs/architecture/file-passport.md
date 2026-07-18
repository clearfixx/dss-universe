# DSS Universe — File Passport Specification 🛰️

## Version 3.0

---

## 1. Philosophy

Good code explains how it works.

Good architecture explains why it exists.

DSS File Passport explains the purpose of a file before the first line of code is read.

It is not decoration.

It is architecture memory.

It helps DSS Universe remember why a file exists, what it owns, and how it fits into the system.

A future maintainer should be able to open a file and understand its role before reading the implementation.

---

## 2. Why File Passport Exists

DSS Universe is designed as a long-term platform.

As the codebase grows, every file should quickly answer:

- What is this file?
- Which module owns it?
- Why does it exist?
- What responsibilities does it have?
- What architectural role does it play?
- What should future maintainers know before changing it?

Without this context, code slowly turns into archaeology.

File Passport prevents that.

It gives every source file a small piece of architectural memory.

---

## 3. Core Principles

### 3.1 Passport explains purpose

Bad:

````ts
/**
 * Purpose:
 * Role service.
 */

Good:

/**
 * Purpose:
 * Coordinates role management operations and encapsulates business logic related to roles.
 */

The Passport should explain why the file exists.

It should not simply repeat the filename.

3.2 Passport explains architectural intent

A File Passport should describe the architectural intent of the file.

Implementation details may change.

Architectural intent should remain stable for longer.

Example:

Bad:

/**
 * Purpose:
 * Calls Prisma to get users.
 */

Better:

/**
 * Purpose:
 * Provides the Users module with a repository adapter for reading and updating user records.
 */

The first version describes current implementation.

The second version describes the architectural role.

3.3 Passport must stay truthful

If the file changes responsibility, update the Passport.

If the Passport lies, it is a bug.

Outdated documentation is worse than missing documentation because it actively misleads future maintainers.

3.4 Passport should help, not decorate

Do not write noise.

Write information that helps future maintainers understand the file faster.

A good Passport answers questions before they are asked.

A bad Passport only makes the file longer.

3.5 Passport scales with file importance

Small DTOs may have short Passports.

Simple type aliases may use the Minimal Template.

Core auth, authorization, database, seed, CMS, AI, and Mission Control files may have richer Passports.

The amount of documentation should match the architectural importance of the file.

Do not add fake importance.

Do not under-document critical infrastructure.

3.6 Humor is allowed, chaos is not

Small jokes and Easter eggs are welcome when they are:

short;
relevant;
tasteful;
useful or memorable;
not distracting.

Humor should make architecture easier to remember.

It should never turn the codebase into a meme wall.

3.7 Passport comes before implementation

A source file should start with its DSS File Passport.

Passport first.

Code second.

The maintainer should understand the file before reading the implementation.

3.8 Full file paths are required

The 📄 File field should use the full project-relative path.

Good:

apps/api/src/modules/users/application/services/users.service.ts

Bad:

users.service.ts

Full paths make Passports searchable, clear, and unambiguous.

This is especially important in a large monorepo where many modules may contain files with the same name.

3.9 Passport format must be consistent

Do not invent local Passport styles.

If the format needs to evolve, update this specification first.

Then gradually migrate the codebase during planned cleanup.

The specification is the source of truth.

3.10 Architecture placeholders are allowed

Some files may exist before they contain implementation.

Examples:

contracts/index.ts
queries/index.ts
commands/index.ts
filters/index.ts
pagination/index.ts

These files are not useless.

They establish architecture.

If such a file exists, it must still contain a Passport explaining why this placeholder exists and what belongs there later.

3.11 Barrel files are architecture files

Barrel files are not “just exports”.

They define stable public entry points.

They should have at least the Minimal Passport.

Example:

export type { UserResponseDto } from './user.response.dto';

Even if this is the only code in the file, the file still has an architectural role.

3.12 End-of-file mission messages are optional

Large architectural files may end with a short mission message.

Example:

/**
 * 🛰️ UsersService is the airlock between user data
 * and the rest of DSS Universe.
 */

Mission messages at the end of files are optional.

They should be short, memorable, and architecture-related.

They must never replace the main Passport.

3.13 Folder documentation is encouraged

Important architectural folders may contain their own README.md.

This is called a Folder Passport.

Folder Passports explain:

why the folder exists;
what belongs inside;
what must never be placed there;
how the folder fits into the module;
examples of correct usage.

Recommended folders:

application/
domain/
infrastructure/
contracts/
dto/
repositories/
mappers/
exceptions/

File Passport explains a file.

Folder Passport explains a directory.

Both help architecture survive growth.

## 4. Official Template

Use this template for most source files.

Examples:

- Services
- Controllers
- Repositories
- Guards
- Mappers
- Validators
- Seed files
- Infrastructure adapters
- Large utilities

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module:
 * 📄 File:
 *
 * 🎯 Purpose:
 *
 * 🧠 Responsibilities:
 * •
 * •
 * •
 *
 * 🏗️ Architecture:
 *
 * ⚠️ Important:
 *
 * 💡 Notes:
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

The Official Template should be the default choice.

Use the Minimal Template only when the file is truly simple.

5. Minimal Template

Use this for very small files.

Examples:

DTOs
Type aliases
Interfaces
Constants
Barrel files
Small utility types
Simple helper functions
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module:
 * 📄 File:
 *
 * 🎯 Purpose:
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

Small files should stay small.

Do not write an Extended Passport for a simple DTO.

6. Sections Explained
🚀 DSS Universe

Project identity.

Every source file belongs to the same platform.

This section reminds future developers that every module is part of one larger system.

📦 Module

The business or technical module that owns the file.

Examples:

Authentication

Authorization

IAM

Database Seed

Users

Forum

CMS

Academy

AI Core

Mission Control

Infrastructure

📄 File

Always use the full project-relative path.

Examples:

apps/api/src/modules/iam/application/services/roles.service.ts
apps/api/src/modules/users/application/dto/responses/user.response.dto.ts
apps/api/src/core/auth/guards/jwt-auth.guard.ts

Avoid short filenames.

The full path immediately tells the reader where the file belongs.

🎯 Purpose

The reason this file exists.

Purpose should answer:

Why was this file created?

It should not answer:

What does every line of code do?

Purpose is about architectural intent.

🧠 Responsibilities

Describe the responsibilities owned by the file.

Use bullet points.

Example:

• validates incoming requests;
• coordinates business logic;
• delegates persistence to repositories.

Responsibilities should describe ownership.

Not implementation details.

🏗️ Architecture

Explains how this file fits into DSS Universe.

Examples:

Thin controller.
Application service.
Domain service.
Repository adapter.
Database seed orchestrator.
Public module API.
Infrastructure component.

This section is especially useful for new developers joining the project.

⚠️ Important

Documents invariants.

Things future developers should not accidentally break.

Examples:

Do not expose password hashes.
Authorization should use permissions rather than role names.
This mapper must never depend on HTTP.
💡 Notes

Optional.

May contain:

architectural hints;
migration notes;
future extension points;
small Easter eggs;
mission messages;
reminders.

Avoid writing implementation details here.

7. Emoji Dictionary

The emoji system provides quick visual context.

It should remain consistent across the entire project.

Emoji	Meaning
🚀	DSS Universe / project identity
📦	Module
📄	File
🎯	Purpose
🧠	Responsibilities / business logic
🏗️	Architecture
⚠️	Important warning
💡	Notes / hints
🛰️	Mission / system-level note
🔐	Authentication
🛡️	Authorization / guards
👤	Users
🗄️	Repository / database access
🌱	Seed
🧬	Prisma schema / data model
🧪	Tests
📝	DTO / API contract
📚	Types
📜	Constants
🧩	Decorator / composition
🔧	Utility
🎨	UI component
🤖	AI module
⚙️	System module
📰	Blog / content
💬	Forum / communication
🎓	Academy / learning

Do not invent new emoji randomly.

If a new category becomes common across DSS Universe, add it to this specification first.

Only then start using it in source files.

## 8. Mission Messages

Mission Messages are optional short notes placed inside a File Passport or at the end of important architectural files.

They add personality to the project while reinforcing architectural ideas.

Mission Messages should be:

- short;
- memorable;
- architecture-related;
- professional;
- optional.

Mission Messages should never replace proper documentation.

Their purpose is to reinforce important architectural ideas.

---

### 🌱 Seed

```ts
/**
 * 🛰️ Never change seed order without coffee and a good reason.
 */
````

---

### 🛡️ Guard

```ts
/**
 * 🛡️ If this guard stopped the request,
 * it probably prevented a very bad day.
 */
```

---

### 🗄️ Repository

```ts
/**
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 */
```

---

### 📄 Controller

```ts
/**
 * 🎯 Controllers dispatch requests.
 * They do not make business decisions.
 */
```

---

### 🧠 Service

```ts
/**
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers,
 * something is wrong.
 */
```

---

### 📝 DTO

```ts
/**
 * 📨 DTO is a contract.
 * If it changes,
 * the API changed too.
 */
```

---

### 🧩 Mapper

```ts
/**
 * 🧩 Mappers translate between worlds.
 * They should never own business logic.
 */
```

---

### 🗂️ Barrel File

```ts
/**
 * 🚪 This file defines a public entry point.
 * Keep exports intentional.
 */
```

---

### 🧬 Prisma Schema

```ts
/// 🌌 This file shapes the entire galaxy.
/// Edit carefully.
```

---

Mission Messages should remain rare.

If every file contains a joke, they stop being memorable.

---

## 9. Examples

### Service Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/application/services/roles.service.ts
 *
 * 🎯 Purpose:
 * Coordinates role management operations and encapsulates
 * role-related business rules.
 *
 * 🧠 Responsibilities:
 * • creates and updates roles;
 * • assigns permissions to roles;
 * • protects system roles from unsafe changes.
 *
 * 🏗️ Architecture:
 * Application service.
 * Owns business logic.
 * Does not know about HTTP.
 *
 * ⚠️ Important:
 * Backend authorization should check permissions,
 * not role names.
 *
 * 💡 Notes:
 * Roles are boring until someone deletes admin.
 * That is why safety checks exist. ☕
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### Controller Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/presentation/controllers/roles.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for role management.
 *
 * 🧠 Responsibilities:
 * • receives validated requests;
 * • delegates operations to RolesService;
 * • protects endpoints with guards.
 *
 * 🏗️ Architecture:
 * Thin controller.
 * No business logic.
 *
 * ⚠️ Important:
 * Do not move business rules into controllers.
 *
 * 💡 Notes:
 * Controllers are dispatchers,
 * not councils of elders.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### Repository Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-users.repository.ts
 *
 * 🎯 Purpose:
 * Implements persistence operations for the Users module.
 *
 * 🧠 Responsibilities:
 * • reads user records;
 * • updates user records;
 * • isolates Prisma from the application layer.
 *
 * 🏗️ Architecture:
 * Infrastructure repository adapter.
 *
 * ⚠️ Important:
 * Never expose Prisma outside Infrastructure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### DTO Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/dto/responses/user.response.dto.ts
 *
 * 🎯 Purpose:
 * Defines the public response contract returned by the Users module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### Mapper Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/mappers/user-response.mapper.ts
 *
 * 🎯 Purpose:
 * Maps safe user objects into public response DTOs.
 *
 * 🧠 Responsibilities:
 * • converts domain models into DTOs;
 * • protects public API contracts.
 *
 * 🏗️ Architecture:
 * Application mapper.
 *
 * ⚠️ Important:
 * Mappers translate.
 * They do not own business logic.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### Barrel File Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/mappers/index.ts
 *
 * 🎯 Purpose:
 * Exposes Users application mappers
 * through one stable public entry point.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### Seed Example

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Seed
 * 📄 File: apps/api/prisma/seed/index.ts
 *
 * 🎯 Purpose:
 * Mission Control for the seed process.
 *
 * 🧠 Responsibilities:
 * • controls execution order;
 * • passes one PrismaClient to child seeds;
 * • keeps initialization predictable.
 *
 * 🏗️ Architecture:
 * Database seed orchestrator.
 *
 * ⚠️ Important:
 * System data must be created before users.
 *
 * 💡 Notes:
 * 🛰️ Never change seed order without coffee
 * and a good reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

## 10. Passport Levels

Not every file requires the same amount of documentation.

Choose the Passport size according to the architectural importance of the file.

---

### Minimal Passport

Use for:

- DTOs
- Types
- Interfaces
- Constants
- Enums
- Small utilities
- Barrel files
- Placeholder architecture files

Goal:

Keep small files small.

Example:

```ts
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/dto/responses/user.response.dto.ts
 *
 * 🎯 Purpose:
 * Defines the public response contract returned by the Users module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
```

---

### Standard Passport

Use for:

- Services
- Controllers
- Repositories
- Guards
- Mappers
- Validators
- Infrastructure adapters
- Medium-sized utilities

Goal:

Document responsibilities and architectural boundaries.

---

### Extended Passport

Use for:

- Authentication
- Authorization
- Prisma
- Database
- Seed
- AI
- CMS
- Mission Control
- Framework Core
- Infrastructure Core

Goal:

Explain architectural decisions, invariants, and future maintenance concerns.

---

Documentation should scale with architectural importance.

---

## 11. Folder Passport

As DSS Universe grows, files alone are no longer enough.

Large architectural folders should contain their own documentation.

This documentation is called a Folder Passport.

Normally it is stored as:

```txt
README.md
```

inside the folder.

---

### Folder Passport explains

- why the folder exists;
- what belongs inside;
- what must never be placed there;
- architectural conventions;
- examples.

---

Recommended folders:

```txt
application/

domain/

infrastructure/

contracts/

dto/

repositories/

exceptions/

mappers/

presentation/

core/
```

---

Example:

application/README.md

might explain:

- why Application exists;
- why Controllers do not belong here;
- why DTOs are separated from Contracts;
- why Services should not know about HTTP.

---

Folder Passports should describe architecture.

They should not duplicate implementation details already documented in individual files.

---

## 12. Engineering Rules

### Rule 1

Every new source file starts with a DSS File Passport.

No exceptions.

Even the smallest source file should use at least the Minimal Passport.

---

### Rule 2

Passport first.

Implementation second.

A maintainer should understand the file before reading the code.

---

### Rule 3

If the Passport lies, it is a bug.

Update it during every meaningful refactoring.

---

### Rule 4

Do not add fake importance.

Keep simple files simple.

Do not write an Extended Passport for a type alias.

---

### Rule 5

Humor is welcome.

Noise is not.

Architecture always comes first.

---

### Rule 6

Always use the full project-relative path.

Good:

```txt
apps/api/src/modules/users/application/services/users.service.ts
```

Avoid:

```txt
users.service.ts
```

---

### Rule 7

Architecture placeholder files are first-class citizens.

Examples:

```txt
contracts/index.ts

queries/index.ts

commands/index.ts
```

These files establish architecture before implementation exists.

Document their purpose.

---

### Rule 8

Barrel files require documentation.

Even if a barrel file only contains exports,
it still defines a public architectural boundary.

Use at least the Minimal Passport.

---

### Rule 9

Mission Messages are optional.

Architecture documentation is mandatory.

Never replace documentation with jokes.

---

### Rule 10

Folder Passports are strongly recommended
for every major architectural directory.

Large folders should explain themselves.

---

### Rule 11

Prefer architectural stability over implementation details.

Passport should explain why the file exists.

Not how every line currently works.

Implementation changes.

Architecture usually survives much longer.

---

### Rule 12

If the Passport specification evolves,
update this document first.

Only then update the source code.

The specification is always the single source of truth.

---

## 13. Writing Guidelines

Writing a good File Passport is a technical skill.

The goal is not to write more.

The goal is to write better.

Every Passport should be concise, informative, and architecture-oriented.

---

### Purpose vs Responsibilities

Purpose answers:

> Why does this file exist?

Responsibilities answer:

> What does this file own?

Good:

Purpose

```txt
Coordinates user-related business operations.
```

Responsibilities

```txt
• validates business rules;
• delegates persistence to repositories;
• returns public response DTOs.
```

Avoid repeating the same information in both sections.

---

### Use Present Tense

Prefer:

```txt
Coordinates...
Provides...
Maps...
Validates...
Protects...
Exposes...
```

Avoid:

```txt
Will coordinate...
Was created...
Should provide...
```

The Passport describes the file as it exists today.

---

### Keep Responsibilities Focused

Responsibilities describe ownership.

Not every implementation detail.

Good:

```txt
• maps domain objects into DTOs;
• protects API contracts.
```

Bad:

```txt
• calls line 52;
• creates an object;
• loops over an array.
```

Implementation belongs in the code.

Architecture belongs in the Passport.

---

### Keep Purpose Short

Purpose should usually fit within one or two sentences.

If Purpose becomes a paragraph,
it probably contains implementation details.

---

### Avoid Duplication

Do not repeat the filename.

Bad:

```txt
Purpose

Users Service.
```

Bad:

```txt
Purpose

Repository for users.
```

Good:

```txt
Purpose

Provides persistence operations for user data while isolating the application layer from Prisma.
```

---

### Notes Are Optional

The Notes section should add value.

Examples:

- architectural hints;
- migration notes;
- extension points;
- small mission messages.

Avoid:

```txt
TODO
```

or

```txt
No notes.
```

If there are no useful notes,

omit them.

---

### The Code Explains HOW

The Passport Explains WHY

Remember this simple rule.

The source code explains implementation.

The File Passport explains architectural intent.

They complement each other.

They should never duplicate each other.

---

### Keep Passports Consistent

Every Passport in DSS Universe should feel like it was written by the same architect.

Consistency is more important than personal writing style.

Future maintainers should immediately recognize a DSS File Passport without reading its title.

---

## 14. Future Evolution

DSS Universe is expected to evolve for many years.

The File Passport specification should evolve with it.

When improvements are discovered:

1. Update this specification.
2. Discuss and approve the change.
3. Apply the new standard to future development.
4. Gradually migrate older source files during planned refactoring.

Never invent local Passport formats inside individual files.

There should always be one official specification.

---

### Versioning Philosophy

The File Passport is a living specification.

Minor improvements should increase the document version.

Example:

```
v3.0
v3.1
v3.2
...
```

Breaking changes should be introduced deliberately and documented.

The specification should remain backward understandable.

---

### Compatibility

Older source files are not required to be rewritten immediately.

During normal development:

- touching a file is a good opportunity to modernize its Passport;
- large cleanup tasks may migrate entire modules at once;
- consistency is preferred over speed.

The goal is gradual evolution.

Not massive rewrites.

---

## 15. Frequently Asked Questions

### Should every source file have a Passport?

Yes.

Every source file starts with a DSS File Passport.

Only the size of the Passport changes.

---

### Should tiny DTOs have full documentation?

No.

Use the Minimal Passport.

---

### Should barrel files have Passports?

Yes.

Even if the file only exports symbols,
it still represents a public architectural entry point.

---

### Should placeholder files contain only comments?

Yes.

Architecture placeholder files may temporarily contain only a Passport.

The Passport explains why the file exists before implementation arrives.

---

### Should README.md files use File Passports?

No.

README files are documentation.

They explain folders rather than individual source files.

Folder documentation follows Folder Passport principles instead.

---

### Should Mission Messages be used everywhere?

No.

Mission Messages should remain relatively rare.

If every file contains one,
they lose their value.

---

## 16. Changelog

### Version 3.0

Major improvements over Version 2:

- Full project-relative paths are now required.
- Introduced Passport Levels.
- Added Folder Passport concept.
- Added architecture placeholder guidance.
- Added barrel file guidance.
- Expanded architectural principles.
- Added Mapper example.
- Added Barrel File example.
- Expanded Engineering Rules.
- Clarified Mission Message usage.
- Improved consistency of examples.
- Clarified Passport evolution process.

---

## 17. Final Thoughts

A File Passport is not written for today's developer.

It is written for the person who will open the file years later and ask:

> "Why does this file exist?"

If the Passport answers that question before the implementation begins,
it has done its job.

Good architecture survives refactoring.

Good documentation survives architecture.

Together they allow software to survive time.

---

## 18. Motto

Architecture is remembered.

Code is rewritten.

Documentation preserves the intent.

**🚀 Build. Share. Grow.**

# File Passport v3.1 — "Engineering with Personality"

## Easter Eggs 🥚

DSS Universe encourages tasteful Easter Eggs in source files.

These are not random jokes. They are part of the project's engineering culture and should reinforce architectural thinking while adding a bit of personality.

Typical location:

- at the end of the file (preferred);
- occasionally inside the AI Note section if appropriate.

---

### Purpose

A good Easter Egg should:

- make the reader smile;
- remind developers about an architectural principle;
- fit naturally into the file;
- never distract from the implementation.

The goal is not comedy.

The goal is memorable engineering.

---

### Rules

An Easter Egg should:

- relate to the current file;
- reinforce a real engineering rule;
- stay under roughly 4–8 lines;
- age well;
- remain professional;
- never mock contributors.

Avoid:

- internet memes;
- political jokes;
- offensive humor;
- jokes unrelated to the file.

---

### Good Examples

#### Authorization

```ts
/**
 * ☕ Architecture Reminder
 *
 * If you suddenly feel like writing:
 *
 * if (user.role === ADMIN)
 *
 * ...
 *
 * it's probably time to make coffee.
 * DSS already has a permission system. ☕
 */
```

---

#### Controller

```ts
/**
 * 🌍 Border Control
 *
 * Controllers translate HTTP.
 *
 * If business logic appears here...
 *
 * ...someone forgot where the application layer lives.
 */
```

---

#### Repository

```ts
/**
 * 🗄️ Repository Wisdom
 *
 * Repositories trust only the database.
 *
 * Everything else is just rumors.
 */
```

---

#### AppModule

```ts
/**
 * 🌌 Mission Control
 *
 * Every new import is another spacecraft docking.
 *
 * Please don't crash them together. 🚀
 */
```

---

### AI Notes

AI Notes may also contain a small friendly message.

Example:

```txt
Hello, fellow AI.

The humans spent hundreds of hours building this station.

Please don't accidentally eject the airlock. 🚀
```

AI Notes should encourage future maintainers—human or AI—to respect the architecture, not replace formal documentation.
