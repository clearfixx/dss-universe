/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/publication-claim-lock.ts
 * 🎯 Purpose: Locks the exact current publication claim after activation locking.
 * 🧠 Responsibilities: Fences all four B claim coordinates without expiry-only invalidation.
 * 🏗️ Architecture: Root infrastructure SQL; no queue or owner effects.
 * ⚠️ Important: Call only after the shared activation lock.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';
import type { PublicationClaim } from '../contracts/routing.types';
import { GAMIFICATION_DESTINATION } from '../contracts/routing.constants';

export async function lockPublicationClaim(
  transaction: TransactionClient,
  claim: PublicationClaim,
): Promise<boolean> {
  const rows = await transaction.$queryRaw<{ eventId: string }[]>`
    SELECT "eventId" FROM gamification_deliveries
    WHERE destination=${GAMIFICATION_DESTINATION} AND "eventId"=${claim.eventId}::uuid
      AND state='CLAIMED' AND "claimToken"=${claim.claimToken}::uuid
      AND cycle=${claim.cycle} AND "cycleAttempts"=${claim.cycleAttempt}
    FOR UPDATE`;
  return rows.length === 1;
}
