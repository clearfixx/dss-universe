# DSS Shared / Domain

The `shared/domain` directory contains business-neutral domain contracts and primitives.

## May contain

- base repository contracts;
- pagination contracts;
- generic domain types;
- reusable value objects;
- domain-neutral primitives.

## Must not contain

- Prisma code;
- NestJS controllers;
- feature-specific entities;
- infrastructure services;
- HTTP-specific DTOs.

## Rule

Shared domain code should be pure TypeScript whenever possible.
