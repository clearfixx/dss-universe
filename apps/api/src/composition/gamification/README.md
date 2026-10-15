# Gamification composition

This root assembly connects independently owned recipient/balance contracts and
the two existing cross-owner recipient transactions. It owns no scoring, title,
achievement, eligibility or permission policy.

| Command                  | Transaction lifetime            | Owned write/evidence                          | Recipient fact                         |
| ------------------------ | ------------------------------- | --------------------------------------------- | -------------------------------------- |
| Manual achievement award | Root, unchanged Prisma defaults | Achievements stateless writer/private helper  | Users ID-only reader, same transaction |
| Custom title grant       | Root, unchanged Prisma defaults | Custom Titles stateless writer/private helper | Users ID-only reader, same transaction |

The pair lock remains before the parallel recipient/definition/existing stage.
Missing recipient takes precedence over missing/inactive definition, then conflict.
Audit precedes Outbox in the same transaction. Provider/evidence failures propagate
and abort; do not cache, pre-read or replace this check with an asynchronous event.
Existence accepts every existing state and is not account eligibility.

Semantic business ports expose only command values and existing results. The
Boolean callback and transaction objects stay in infrastructure. Root imports
explicit guarded infrastructure entries; it never copies owner-table SQL or
evidence algorithms. Private evidence helpers and persistence projections are
reused inside their owners, not exported from technical or business roots.

The independent recipient adapter for Points/Levels/Achievements remains separate.
IAM transactional checks and assignment-anchor reads are separate D4 packages.
