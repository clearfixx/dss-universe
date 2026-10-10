# D1 — Canonical scope decisions

Date: 2026-10-10. Authority: explicit owner replies in the D1 working conversation.
These decisions approve scope/ownership, not historical quality exceptions.

## DEC-D1-01 — Groups, Premium and Guardian capabilities

**Approved:** retain generic access groups and Premium in the 1.0 contract.
IAM owns assignment and membership; Authorization owns effective permission
decisions; Knowledge Forge consumes only a narrow Guardian capability.
Phase 14 sanctions take precedence over groups/Premium privileges.

Existing role/direct permission assignment is not a completed generic-group
implementation. Phase 5 remains partial. Group presentation and allowlisted
delegation must not grant generic moderation/admin/security authority.

Alternatives considered: remove generic groups and use only IAM Guardian assignment;
rejected by the owner's choice. D2 specifies contracts and delivery ordering before
Phase 11 needs them. This decision does not authorize building groups inside Auth,
Users, Knowledge Forge or silently expanding D3. A separate implementation package
must be scheduled if required beyond existing D3/D4 scope.

## DEC-D1-02 — Operational storage scope

**Approved:** LOCAL is the current operational provider. MinIO/S3 adapters remain
separate unclosed debt and are not a Phase 11 entry prerequisite. Preserve provider
identities and extensibility; do not claim operational parity from enum values.
This formalizes the earlier D0 decision to defer the S3/MinIO adapter.

Phase 6 implementation scope is the extensible LOCAL vertical slice. Its historical
completion does not establish current full acceptance. DEBT-017 remains visible
and requires its own package/acceptance before claiming multi-provider support.

## DEC-D1-03 — Search scope

**Approved:** current News search is a News-local projection. Shared Search Platform
is future work, not a delivered Phase 10 platform and not a Phase 11 entry prerequisite.
DEBT-018 retains the missing shared platform/indexing contract. D2 must define the
future integration boundary without inventing a Search implementation in News.

## Acceptance and non-decisions

No blanket historical exception or red-CI acceptance was granted. Phase 8 and
Phase 10 can be classified as implemented based on code, migrations and tests,
but release acceptance remains pending D6/D7 and owner review.
Phase 11 still requires debt closure, Guardian ownership readiness and an approved
brainstorm. Deferring storage/Search does not waive security or quality gates.

Passport rendering repair preserves v3.1 semantics/templates. Generated/config/schema
inclusion policy is still a D5 owner decision, not silently approved in D1.
