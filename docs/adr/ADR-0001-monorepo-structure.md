# ADR-0001 — Modular Monorepo and Modular Monolith

- Status: Accepted
- Date: 2026-07-18

## Context

DSS Universe contains Web, API, Worker and shared packages. Its domains must evolve independently without premature distributed-system complexity.

## Decision

Use a pnpm/Turborepo monorepo. The backend remains a NestJS modular monolith with a separate asynchronous Worker. Modules own their data and expose public application contracts. Later service extraction is permitted only when operational evidence justifies it.

## Consequences

- shared tooling and contracts remain versioned together;
- module boundaries must be enforced by imports and tests;
- feature modules may not access another module's Prisma repository;
- asynchronous work can scale through Worker processes before service extraction;
- deployment may separate Web, API and Worker while preserving one repository.
