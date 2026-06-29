# DSS Universe — File Passport Specification 🛰️

## 1. Philosophy

Good code explains how it works.

Good architecture explains why it exists.

DSS File Passport explains the purpose of a file before the first line of code is read.

It is not decoration. It is architecture memory.

---

## 2. Why File Passport Exists

DSS Universe is designed as a long-term platform.

As the codebase grows, every file should quickly answer:

- What is this file?
- Which module owns it?
- Why does it exist?
- What responsibilities does it have?
- What should future maintainers know before changing it?

---

## 3. Core Principles

### 3.1 Passport explains purpose

Bad:

```ts
/**
 * Purpose:
 * Role service.
 */

Good:

/**
 * Purpose:
 * Coordinates role management operations and encapsulates business logic related to roles.
 */
3.2 Passport must stay truthful

If the file changes responsibility, update the Passport.

If the Passport lies, it is a bug.

3.3 Passport should help, not decorate

Do not write noise.

Write information that helps future maintainers understand the file faster.

3.4 Passport scales with file importance

Small DTOs may have short Passports.

Core auth, authorization, database, seed, CMS, AI, and Mission Control files may have richer Passports.

3.5 Humor is allowed, chaos is not

Small jokes and Easter eggs are welcome when they are:

short;
relevant;
tasteful;
useful or memorable;
not distracting.
4. Official Template v2
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
5. Minimal Template

Use this for very small files such as simple DTOs or type aliases.

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
6. Sections Explained
🚀 DSS Universe

Project identity.

This reminds us that every file belongs to the same platform.

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
📄 File

The file name or relative project path.

Examples:

roles.service.ts
apps/api/src/modules/iam/roles/roles.service.ts
🎯 Purpose

The reason this file exists.

It should not simply repeat the filename.

🧠 Responsibilities

The concrete things this file owns.

Use bullet points.

🏗️ Architecture

How this file fits into the system.

Examples:

Thin controller.
IAM service.
Database seed.
Authorization guard.
Public module API.
⚠️ Important

Warnings, invariants, or things future maintainers should not break.

💡 Notes

Optional hints, context, jokes, or small Easter eggs.

7. Emoji Dictionary
Emoji	Meaning
🚀	DSS Universe / project identity
📦	Module
📄	File
🎯	Purpose
🧠	Responsibilities / business logic
🏗️	Architecture
⚠️	Important warning
💡	Notes / hints
🛰️	Mission / system-level warning
🔐	Authentication
🛡️	Authorization / guards
👤	Users
🗄️	Repository / database access
🌱	Seed
🧬	Prisma schema / data model
🧪	Tests
📝	DTO / input contract
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
8. Mission Messages

Mission messages are optional short lines that add project character.

They should be memorable but not noisy.

🌱 Seed
/**
 * 🛰️ Never change seed order without coffee and a good reason.
 */
🛡️ Guard
/**
 * 🛡️ If this guard stopped the request,
 * it probably prevented a very bad day.
 */
🗄️ Repository
/**
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 */
📄 Controller
/**
 * 🎯 Controllers dispatch requests.
 * They do not make business decisions.
 */
🧠 Service
/**
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers, something is wrong.
 */
📝 DTO
/**
 * 📨 DTO is a contract.
 * If it changes, the API changed too.
 */
🧬 Prisma Schema
/// 🌌 This file shapes the entire galaxy.
/// Edit carefully.
9. Examples
Service Example
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: roles.service.ts
 *
 * 🎯 Purpose:
 * Coordinates role management operations and encapsulates role-related business rules.
 *
 * 🧠 Responsibilities:
 * • creates and updates roles;
 * • assigns permissions to roles;
 * • protects system roles from unsafe changes.
 *
 * 🏗️ Architecture:
 * IAM service. Owns business logic. Does not know about HTTP.
 *
 * ⚠️ Important:
 * Backend authorization should check permissions, not role names.
 *
 * 💡 Notes:
 * Roles are boring until someone deletes admin.
 * That is why safety checks exist. ☕
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
Controller Example
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: roles.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for role management.
 *
 * 🧠 Responsibilities:
 * • receives validated requests;
 * • delegates role operations to RolesService;
 * • protects endpoints with guards and permissions.
 *
 * 🏗️ Architecture:
 * Thin controller. No business logic.
 *
 * ⚠️ Important:
 * Do not move IAM business rules into this controller.
 *
 * 💡 Notes:
 * Controller is a dispatcher, not a council of elders.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
Seed Example
/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Seed
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Mission Control for the seed process.
 *
 * 🧠 Responsibilities:
 * • controls seed execution order;
 * • passes one PrismaClient to child seed files;
 * • keeps database initialization predictable.
 *
 * 🏗️ Architecture:
 * Database seed orchestrator.
 *
 * ⚠️ Important:
 * System data must be created before users.
 *
 * 💡 Notes:
 * 🛰️ Never change seed order without coffee and a good reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
10. Engineering Rules
Rule 1 — Every new source file starts with DSS File Passport

No exceptions.

Even small files should have at least the minimal template.

Rule 2 — Passport first, code second

A maintainer should understand the file before reading the implementation.

Rule 3 — If Passport lies, it is a bug

Update it during refactoring.

Rule 4 — Do not add fake importance

Keep simple files simple.

Do not write a huge Passport for a trivial type alias.

Rule 5 — Do not turn codebase into a meme wall

Humor is welcome.

Noise is not.

11. Future Evolution

If the Passport format changes, update this document first.

Then update source files during a planned cleanup.

Do not invent new Passport formats randomly in individual files.

12. Motto

Architecture is remembered.

Code is rewritten. 🚀
