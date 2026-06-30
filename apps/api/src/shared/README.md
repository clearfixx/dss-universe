# DSS Shared

The `shared` directory contains reusable, business-neutral building blocks.

Shared code must stay independent from feature modules and infrastructure.

## May contain

- shared domain primitives;
- generic repository contracts;
- pagination types;
- common exceptions;
- neutral application helpers;
- constants;
- utilities.

## Must not contain

- feature-specific business logic;
- Prisma implementations;
- NestJS module wiring;
- imports from business modules.

## Rule

If a shared abstraction is useful for only one module, it probably does not belong in `shared` yet.
