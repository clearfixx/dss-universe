# DSS Shared / Application

The `shared/application` directory is reserved for reusable application-layer helpers and contracts.

## May contain

- application-level helper types;
- mapper helpers;
- generic DTO helpers;
- reusable use-case patterns.

## Must not contain

- feature-specific services;
- module-specific business workflows;
- Prisma implementations;
- controller logic.

## Rule

Application helpers may support modules, but must not know about any specific module.
