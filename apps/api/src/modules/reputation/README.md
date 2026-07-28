# Reputation Module

## Purpose

Reputation owns direct user-to-user `+1` and `-1` decisions. It is independent
from Community Points, content reactions and role/group permissions.

## Invariants

- every decision has a visible actor, recipient, value and public reason;
- an actor may rate the same recipient once per rolling 24 hours;
- account-age eligibility comes from a Mission Control policy;
- blocked or inactive users cannot exchange reputation;
- ledger entries cannot be updated or deleted;
- moderator reversal appends a compensating entry;
- score is the sum of ledger values and can always be rebuilt;
- Audit and Outbox evidence commit in the same transaction.

## Boundary

```text
GraphQL Resolver
      ↓
ReputationService
      ↓
ReputationRepository
      ↓
PostgreSQL append-only ledger
```

Community Points, levels, titles and achievements are separate Phase 8
packages. Content votes do not implicitly mutate direct reputation.

The ledger remembers; the UI explains.
