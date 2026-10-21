# ADR-0006 — Public Soft Deletion with Explicit Retention

- Status: Accepted
- Date: 2026-07-18

## Context

Moderation requires removed public content to remain reviewable and leave a visible tombstone. Security, privacy and operational data cannot all be retained indefinitely.

## Decision

Public user-generated content uses soft deletion with actor, reason and timestamps. Normal users see a tombstone; authorized staff may inspect the original. Restore and purge are separate audited operations.

Secrets, refresh tokens, caches, temporary objects and data subject to privacy/security deletion follow hard-delete or anonymization policies. Each domain defines retention, restore and purge behavior; a generic `isDeleted` flag is insufficient by itself.

## Consequences

- repositories exclude soft-deleted records by default but support authorized inspection;
- uniqueness constraints and references must account for lifecycle state;
- search/feed projections react to deletion and restoration events;
- DSS Media Platform retains referenced binaries until retention and reference rules permit purge;
- scheduled purge jobs require audit and legal/privacy safeguards.
