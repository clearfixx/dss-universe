/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/activation-lock.ts
 * 🎯 Purpose: Reads current control state under the protocol's shared admission lock.
 * 🧠 Responsibilities: Preserves control-before-work lock order.
 * 🏗️ Architecture: Infrastructure-only transaction helper.
 * ⚠️ Important: No network work may run while holding this lock.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';
import type { ActivationView } from '../contracts/routing.types';
import { GAMIFICATION_DESTINATION } from '../contracts/routing.constants';
export async function lockActivation(
  transaction: TransactionClient,
): Promise<ActivationView | null> {
  const rows = await transaction.$queryRaw<ActivationView[]>`
    SELECT state, cutoff, revision FROM gamification_activations
    WHERE destination=${GAMIFICATION_DESTINATION} FOR SHARE`;
  return rows[0] ?? null;
}
