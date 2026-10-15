/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Projection Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-entry.mapper.ts
 *
 * 🎯 Purpose:
 * Shares explicit safe public entry mapping without sharing read/write transaction orchestration.
 *
 * 🧠 Responsibilities:
 * • copies only the existing ledger/actor/reversal response fields;
 * • rejects missing actor evidence instead of exposing a partial response.
 *
 * 🏗️ Architecture:
 * Pure root-infrastructure mapper; no SQL, permissions, policy, cache or transaction lifetime.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ReputationActor, ReputationEntry } from '@api/modules/reputation';
import type {
  ReputationEntryFact,
  ReputationReversalFact,
} from '@api/modules/reputation/infrastructure';

function actor(
  profiles: ReadonlyMap<string, ReputationActor>,
  id: string,
): ReputationActor {
  const found = profiles.get(id);
  if (!found) throw new Error('Reputation actor evidence is incomplete.');
  return {
    id: found.id,
    username: found.username,
    displayName: found.displayName,
    avatarUrl: found.avatarUrl,
  };
}
export function composeReputationEntry(
  entry: ReputationEntryFact,
  profiles: ReadonlyMap<string, ReputationActor>,
  reversed: ReputationReversalFact | undefined,
  reversalProfiles: ReadonlyMap<string, ReputationActor>,
): ReputationEntry {
  return {
    id: entry.id,
    actor: actor(profiles, entry.actorId),
    recipientId: entry.recipientId,
    value: entry.value as -1 | 1,
    reason: entry.reason,
    createdAt: entry.createdAt,
    reversal: reversed
      ? {
          id: reversed.id,
          reason: reversed.reason,
          createdAt: reversed.createdAt,
          actor: actor(reversalProfiles, reversed.actorId),
        }
      : null,
  };
}
