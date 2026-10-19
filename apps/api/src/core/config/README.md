# Core / config

Reserved for the DSS Universe config infrastructure.

## Responsibility

This directory contains application-wide infrastructure related to config.

## Must contain

- infrastructure
- framework integrations
- technical services

## Must not contain

- business logic
- feature modules
- domain rules

This directory is intentionally created as part of the DSS Platform Foundation.

## Configuration assembly boundary

`config-loaders.ts` owns the ordered namespace factories and loader array.
`configuration.module.ts` consumes that file directly and registers the existing
validation/options. `index.ts` is the explicit public entry, not an internal
dependency of either file: importing the barrel from its own module recreates a
static initialization cycle. Keep namespace order and environment-file precedence
unchanged when maintaining this boundary.
