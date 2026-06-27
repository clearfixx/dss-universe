# Architecture Standard

DSS Universe uses a modular architecture.

## Main areas

```text
core/      infrastructure and cross-cutting systems
modules/   business features
shared/    reusable utilities and common code
Core

Core contains infrastructure-level systems:

auth
config
database
logging
cache
security

Core should not contain business-specific features.

Modules

Modules contain product functionality:

users
forums
blog
academy
permissions
notifications
Rule

Architecture decisions must optimize for long-term maintainability, not short-term convenience.
```
