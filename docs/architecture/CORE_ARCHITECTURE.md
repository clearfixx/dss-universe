# DSS Universe • Core & Shared Architecture Foundation

## Status

Approved as the architectural foundation for Phase 2.7.

This document defines how the backend source tree should be organized and how future modules should depend on shared and core layers.

---

## Goal

The goal of the Core & Shared Architecture Foundation is to prevent DSS Universe from growing into a chaotic codebase.

Every future module should follow the same rules:

- predictable structure;
- clear ownership;
- no random cross-module imports;
- reusable shared primitives;
- stable core infrastructure;
- clean separation between domain, application, infrastructure, and presentation code.

---

## Source Structure

```txt
apps/api/src/

core/
  auth/
  config/
  database/
  security/
  logger/
  cache/
  mail/
  queue/
  scheduler/
  events/

shared/
  domain/
  application/
  exceptions/
  utils/
  constants/
  types/

modules/
  users/
  forum/
  blog/
  academy/
  cms/
  downloads/
  support/
  messages/
Core Layer

The core layer contains application-wide infrastructure and system services.

Core is not a place for business logic.

Core may contain
authentication infrastructure;
authorization and permissions engine;
database module;
config module;
logger;
cache;
mail;
queue;
scheduler;
events;
security tools;
app-level guards and interceptors.
Core must not contain
forum logic;
blog logic;
academy logic;
CMS business rules;
user profile business rules;
feature-specific DTOs;
feature-specific mappers.

If something belongs to one business module, it does not belong in core.

Shared Layer

The shared layer contains reusable, business-neutral building blocks.

Shared code must be generic enough to be used by many modules.

Shared may contain
base repository contracts;
pagination types;
common result types;
reusable application types;
common exceptions;
base domain primitives;
utility functions;
constants that are not feature-specific.
Shared must not contain
Prisma-specific logic;
NestJS module wiring;
business rules of a specific feature;
imports from modules;
imports from core, unless explicitly approved.

Shared should stay boring, stable, and clean.

Modules Layer

The modules layer contains business features.

Each major DSS feature should live in its own module.

Examples:

modules/
  users/
  forum/
  blog/
  academy/
  cms/
  downloads/
  support/
  messages/

Each module should own its business logic.

A module may import from:

shared;
core when infrastructure access is needed;
its own internal folders.

A module should not import directly from another module unless there is a clearly approved public API.

Standard Module Structure

Each mature module should follow this structure:

modules/example/

domain/
  entities/
  repositories/
  value-objects/
  constants/
  exceptions/

application/
  services/
  use-cases/
  dto/
  mappers/

infrastructure/
  repositories/
  persistence/

presentation/
  controllers/
  dto/

example.module.ts
index.ts

Small modules may start with fewer folders, but should grow toward this structure.

Layer Responsibilities
Domain

Domain contains the business model.

It may contain:

entities;
value objects;
domain-specific repository interfaces;
domain exceptions;
domain constants.

Domain should not depend on NestJS, Prisma, HTTP, or database implementation details.

Application

Application contains use cases and orchestration.

It may contain:

services;
use cases;
application DTOs;
mappers;
coordination between repositories.

Application may depend on domain contracts.

Infrastructure

Infrastructure contains technical implementations.

It may contain:

Prisma repositories;
persistence adapters;
external service adapters.

Infrastructure implements contracts defined by domain or application layers.

Presentation

Presentation contains API-facing code.

It may contain:

controllers;
request DTOs;
response DTOs;
route-level decorators.

Presentation should call application services, not repositories directly.

Dependency Rules

Allowed direction:

presentation -> application -> domain
infrastructure -> domain
modules -> shared
modules -> core

Forbidden direction:

shared -> modules
shared -> core
core -> modules
domain -> infrastructure
domain -> presentation
application -> presentation

The deeper layer should not know about the outer layer.

Repository Rules

Query and mutation responsibilities should be separated when the module grows enough.

Recommended contracts:

domain/repositories/example-query.repository.interface.ts
domain/repositories/example-mutation.repository.interface.ts

Query repositories are read-only.

Mutation repositories change state.

Prisma implementations belong in:

infrastructure/repositories/
Import Rules

Prefer public module exports through index.ts.

Good:

import type { PaginationOptions } from '@/shared';

Acceptable when needed:

import { UsersService } from './application/services/users.service';

Avoid:

import { SomethingInternal } from '../other-module/infrastructure/...';

Deep imports across module boundaries are forbidden unless explicitly approved.

Users Module Role

The Users module is the first reference module for this architecture.

Future modules should use it as a practical example for:

folder structure;
repository contracts;
service layer;
mapper placement;
exception placement;
public exports.
Architecture Principle

DSS Universe should not grow by accident.

Every new folder should answer one question:

What responsibility does this layer own?

If the answer is unclear, the folder probably should not exist yet.

Phase 2.7 Migration Plan
Approve this document.
Create the core and improved shared structure.
Move shared repository contracts into shared/domain/repositories.
Move shared pagination types into shared/domain/types.
Update shared exports.
Refactor Users module imports.
Confirm build.
Commit foundation changes.
Update Version History.
Final Rule

Architecture may evolve, but it must evolve deliberately.

No silent structural drift.
No random shared dumping ground.
No module spaghetti.

DSS Universe is a long-term platform, not a weekend prototype.
