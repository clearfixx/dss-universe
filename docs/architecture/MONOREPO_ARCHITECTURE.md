# DSS Universe • Monorepo Architecture

> Version: 1.0
> Status: Approved
> Applies to: Entire DSS Universe repository

---

## Purpose

This document defines the high-level structure of the DSS Universe monorepo.

The monorepo is the foundation for all applications, packages, tools, documentation, and future platform services.

---

## Repository Structure

```txt
dss-universe/

apps/
packages/
docs/
standards/
scripts/
tools/
apps

The apps directory contains deployable applications.

Each application must be independently understandable and runnable.

apps/

api/
web/
admin/
Current apps
apps/api

NestJS backend API.

Future apps
apps/web

Main Next.js frontend.

apps/admin

Optional separate admin interface if the main web app becomes too large.

packages

The packages directory contains reusable internal libraries.

Packages should not be deployable applications.

Future examples:

packages/

ui/
config/
eslint-config/
typescript-config/
sdk/
contracts/
Package rules

Packages should:

have a clear responsibility;
be reusable by more than one app;
avoid application-specific business logic;
expose a stable public API.
docs

The docs directory contains project documentation.

Documentation is part of the product.

Recommended structure:

docs/

architecture/
engineering/
development/
modules/
database/
api/
roadmap/
version-history/
adr/
standards

The standards directory contains long-living engineering standards.

Examples:

standards/

DSS_ENGINEERING_STANDARDS.md

Standards describe how DSS Universe should be built and maintained.

scripts

The scripts directory contains project-level scripts.

Scripts should automate repeatable development tasks.

Examples:

scripts/

setup/
maintenance/
checks/
tools

The tools directory contains internal developer tools.

Examples:

tools/

scripts/
generators/
validators/

Tools may support:

code generation;
architecture validation;
migration helpers;
developer onboarding;
maintenance workflows.
Application Boundary

An app may import from:

packages/

An app should not import directly from another app.

Forbidden:

apps/web -> apps/api/src/...
apps/admin -> apps/web/src/...

Allowed:

apps/web -> packages/contracts
apps/admin -> packages/ui
apps/api -> packages/config
Backend Source Structure

The backend API should follow this structure:

apps/api/src/

core/
shared/
modules/
core

System-level infrastructure.

shared

Business-neutral reusable building blocks.

modules

Business features.

Future Platform Areas

The monorepo should be ready for future expansion.

Possible future areas:

apps/worker
apps/cli
apps/mobile
apps/desktop

packages/ui
packages/contracts
packages/sdk
packages/auth
packages/config
packages/testing

These should be added only when there is a real need.

Do not create empty architecture just because it looks impressive.

Documentation as Product

Documentation is not an afterthought.

Every major architectural decision should be reflected in documentation.

Important docs:

docs/architecture/
docs/engineering/
docs/development/
docs/version-history/
Architecture Decision Records

Large architectural decisions should be stored in:

docs/adr/

ADR documents should explain:

context;
decision;
alternatives;
consequences.

Example:

docs/adr/ADR-0001-monorepo-structure.md
Monorepo Rule

The monorepo should stay boring and predictable.

A new folder is allowed only when it has a clear long-term responsibility.

Avoid:

misc/
common/
stuff/
temp/
experimental/
Final Rule

DSS Universe is a platform.

The repository must be organized so that future applications, modules, tools, and packages can grow without destroying the existing structure.
```
