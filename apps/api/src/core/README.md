# DSS Core

The `core` directory contains application-wide infrastructure used by the DSS Universe API.

Core is responsible for system-level building blocks, not business features.

## May contain

- authentication infrastructure;
- configuration;
- database infrastructure;
- security tools;
- logging;
- cache;
- mail;
- queues;
- events;
- scheduler.

## Must not contain

- feature-specific business logic;
- forum logic;
- users business rules;
- CMS rules;
- academy logic;
- presentation DTOs;
- module-specific repositories.

## Rule

If code belongs to one business module, it does not belong in `core`.
