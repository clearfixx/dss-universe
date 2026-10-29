# DEBT-090 — Achievements rollback before a late original

Date: 2026-10-29. Baseline: accepted maincc39080.
Status: OPEN — characterized owner-policy gap; runtime correction not authorized.
Scope: prerequisite for reliable DEBT-007 C out-of-order automatic delivery.

The actual AchievementsService validates the envelope, then handles
reversedSourceType/reversedSourceId before looking up award rules. Its repository
revokes existing source awards, but does not persist revocation of an absent
source. A migrated owned-schema test now proves:

1. A valid synthetic rollback for a source with no award returns an empty list.
2. A later matching original event awards an active Achievement for that source.
3. Explicitly replaying rollback then revokes that award.
4. Replaying the original uses its owned marker and does not create another award.

The original uses configured recipientPayloadKey=beneficiaryId; rollback has a
different valid synthetic name without an award rule. No actual production
publisher, automatic queue, concurrent race, remote exploit or user-data loss is
claimed. This is a real owner-service sequence, not a failure injected into the
owner or a mocked database response. The test characterizes current behavior;
its green status is not proof of the desired monotonic rollback invariant.

Points has a different contract: source revocation is durable even without an
original; a later original is ignored without a synthetic debit. The same test
file independently proves that behavior. It must not be inferred for Achievements.

Before automatic consumption, agree on owner-local source revocation semantics.
Recommended investigation: durable source state and shared source serialization
for awards/rollback, retaining per-rule markers, immutable Audit/Outbox, currently
matched source awards and manual-award rules. Exact schema, handling of already
existing awards, lock order and concurrent attempts require separate design and
approval. Do not create a root-owned Achievements table or silently rewrite history.
No historical replay/backfill is authorized by this gap.

The policy must explicitly cover later legitimate source qualification or
reinstatement, such as a new publication after withdrawal. Neither a permanent
ban by source ID nor automatic restoration is assumed. Agree on the source
lifecycle/revision boundary before implementing durable revocation state.

## Owner decision — 2026-10-29

The owner approved the new-cycle policy: late events from an old qualification
must not restore its revoked award, while a new legitimate producer-approved
qualification of the same material may earn an award under the current rules.
This does not automatically restore a badge or bypass repeatability, cooldown,
caps or eligibility. The owner also accepted design/characterization PR108,
merged asddb685d; that acceptance does not authorize a runtime correction.

C1 must now specify qualification identity, withdrawal/reinstatement coordinates,
legacy unversioned handling and serialization without guessing an ordering from
wall time. Schema/migration and owner-runtime approval remain separate gates.

Evidence: [migrated characterization](../../apps/api/test/gamification-delivery-characterization.e2e-spec.ts),
focused4/4 including the two existing Points replay/atomicity tests. Raw focused
output is retained at node_modules/.cache/debt007-c-characterization.log.
