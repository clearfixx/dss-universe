/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/routing-validation.ts
 * 🎯 Purpose: Rejects invalid technical commands before database work.
 * 🧠 Responsibilities: Validates bounded batches, identities and revisions.
 * 🏗️ Architecture: Local argument validation; no transport mapping.
 * ⚠️ Important: Operator authorization belongs to the later operational boundary.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PublicationClaim, RoutingOperator } from './routing.types';
import { ROUTING_PUBLICATION_BUDGET } from './routing.constants';
export function assertBatch(value: number, maximum: number): void {
  if (!Number.isInteger(value) || value < 1 || value > maximum)
    throw new TypeError('Invalid routing batch size');
}
export function assertIdentity(value: string): void {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length < 1 ||
    value.length > 200
  )
    throw new TypeError('Invalid routing operational identity');
}
export function assertOperator(operator: RoutingOperator): void {
  if (!operator || !['USER', 'SYSTEM', 'SERVICE'].includes(operator.actorType))
    throw new TypeError('Invalid routing operator');
  assertIdentity(operator.actorId);
}
export function assertRevision(revision: bigint): void {
  if (
    typeof revision !== 'bigint' ||
    revision < 0n ||
    revision > 9223372036854775807n
  )
    throw new TypeError('Invalid routing revision');
}
export function assertClaim(claim: PublicationClaim): void {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !claim ||
    !uuid.test(claim.eventId) ||
    !uuid.test(claim.claimToken) ||
    !Number.isSafeInteger(claim.cycle) ||
    claim.cycle < 0 ||
    claim.cycle > 2147483647 ||
    !Number.isInteger(claim.cycleAttempt) ||
    claim.cycleAttempt < 1 ||
    claim.cycleAttempt > ROUTING_PUBLICATION_BUDGET
  )
    throw new TypeError('Invalid routing claim');
}
