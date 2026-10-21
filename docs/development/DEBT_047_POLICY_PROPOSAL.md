# DEBT-047 — Recoverable administration policy proposal

> Superseded for product-policy approval on 2026-10-13: the owner clarified a
> unique non-transferable platform owner and instructed implementation of new
> administrative rights/features only in their relevant phases. Do not implement
> this six-key proposal as the owner model. See [decisions](COMMAND_DECK_OWNER_DECISIONS.md).
> The underlying availability finding is not claimed resolved.

Date: 2026-10-13. Status: DESIGN PROPOSAL; owner authorized design, not policy acceptance.
Evidence: [availability review](../audits/D3_4_ADMINISTRATOR_AVAILABILITY_REVIEW.md).

## Invariant and capability set

Recommend at least one ACTIVE subject holding the complete effective union of:

| Permission           | Recovery operation supported                                  |
| -------------------- | ------------------------------------------------------------- |
| `users.read`         | Inspect a subject's access summary                            |
| `roles.read`         | Discover existing roles                                       |
| `roles.create`       | Rebuild a permission container                                |
| `roles.update`       | Assign roles to subjects                                      |
| `permissions.read`   | Discover permission IDs and keys                              |
| `permissions.manage` | Create permissions, assign direct grants and edit role grants |

One subject must hold the entire set; distributing its members among several
subjects is not sufficient. Count direct and role-derived grants as a union;
duplicates contribute once. No privileged role-name bypass, positive cache or
stale JWT grant is accepted. DEBT-046's existing per-protected-role assignment
rule remains an additional invariant, not replaced by this one.

This is recovery of IAM administration, not proof of every Command Deck feature,
account reactivation by an administrator, password possession or human availability.
ACTIVE is the currently agreed eligibility boundary. Temporary login-abuse locks,
2FA availability, email-policy changes and future sanctions need separate explicit
policy decisions; the implementation must not call these fully covered.

## Covered application writes

Evaluate authoritative post-mutation capability coverage inside the transaction
for self-deactivation, direct/role grant revocation, role permission revocation,
role deletion, and permission deletion or key rename. Include grants and
reactivation in the same serialization protocol so repairs cannot race with
destructive decisions. Do not rely on guards evaluated before the transaction.

UsersService.changeStatus currently has no production caller. Remove that unused
foreign-owned write after a full consumer check; do not keep an unguarded latent
status command or add a public replacement merely for compatibility speculation.
Future status/moderation commands must join this protocol before exposure.

If a covered destructive write leaves no qualifying subject, deny and roll back
the entire mutation, including session revocation and audit writes. Preserve
successful response shapes; propose HTTP 400 / normal GraphQL business error for
denial, with a stable non-secret message and no disclosure of other admins.

## Ownership and atomicity

- Auth owns credentials and authoritative eligibility. It never imports IAM or
  reads roles, permissions or profiles to enforce this policy.
- IAM owns grant and permission mutations and private repositories.
- Authorization owns the pure recovery-capability predicate over minimal facts.
- A dedicated root-composition use case coordinates narrow owner capabilities.
  No universal user facade or generic public transaction/client is introduced.

Recommend one fixed, documented PostgreSQL transaction-scoped advisory lock for
administration availability in the existing single database. Acquire it before
any role/subject locks or relevant state reads. Use READ COMMITTED and read
post-mutation authoritative facts after acquiring the lock. Retain DEBT-046's
role lock after this global lock. All covered writers use the same lock order;
independent per-role locks do not serialize cross-owner changes.

The composition-owned infrastructure unit of work supplies transaction-bound
narrow operations, implemented by owned infrastructure adapters. Prisma clients
and transaction objects stay out of public/application contracts. Mutation,
eligibility/capability reads and audit must share one database transaction;
checking after a separately committed owner operation is invalid. Construction
and lifecycle of scoped adapters require architecture review before coding.

Do not emit notifications before commit. Any added durable secondary event must
use the existing transactional Outbox, not an in-process success callback.

## Bootstrap and failure behavior

Do not silently create an admin or modify seeded privileges. Check the existing
baseline before deployment. A zero-qualified baseline needs explicit operator
bootstrap/repair; additive grants and reactivation may repair it through the
serialized path. Destructive writes must not grandfather a zero baseline.
Unrelated profile writes remain outside this gate. No permanent bypass endpoint.
Database/lock/read failure must fail closed, with bounded operational error
handling; no cache or JWT fallback. Raw SQL/operator intervention, credential
loss and database outages remain outside the application guarantee.

No schema change is expected for an advisory lock. Reject multiple-database
deployment assumptions; this design relies on the existing shared PostgreSQL.

## Required acceptance evidence

1. Pure predicate: full set, missing key, split subjects, inactive holder,
   direct/role overlap, custom role and no role-name bypass.
2. Owned DB fixtures: final eligible deactivation denied, non-final succeeds,
   direct/role revocation, key rename/delete and role delete evaluated after mutation.
3. Deterministic real concurrency: two deactivations; deactivation versus grant
   revocation; mutations of different roles/permissions; actual observed lock
   barriers, not sleep-based timing guesses.
4. Injected audit/validation failure proves full rollback, including sessions.
5. Zero-baseline repair, missing entity and unchanged successful API contracts.
6. HTTP/GraphQL denial and subsequent authoritative access; no real seed/global
   administrator modification during tests.
7. Architecture checks prove Auth has no IAM dependency and no public ORM/client
   leak. Full package quality gates and draft PR review remain mandatory.

## Approval requested before implementation

Approve the six-key single-subject ACTIVE predicate, global serialization and
zero-baseline behavior. Review scoped owned-adapter wiring before implementation.
This proposal is not permission to implement future moderation, sanctions,
generic groups/Premium, new UI or Phase 11.
