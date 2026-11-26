/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/reputation-source.port.ts
 *
 * 🎯 Purpose:
 * Where a reputation change was made (owner 2026-11-26): today a forum post.
 * The owning module confirms the source is visible to the actor, names its
 * author (the recipient) and reports whether it still exists.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const REPUTATION_SOURCE_TYPES = ['FORUM_POST'] as const;
export type ReputationSourceType = (typeof REPUTATION_SOURCE_TYPES)[number];

export type ReputationSourceRef = Readonly<{
  type: ReputationSourceType;
  id: string;
}>;

export type ReputationSourceStatus = 'AVAILABLE' | 'DELETED';

export interface ReputationSourceReader {
  /** Author of a source the actor may see; null when unknown or hidden. */
  recipientOf(
    actorId: string,
    source: ReputationSourceRef,
  ): Promise<string | null>;
  /** Status per `${type}:${id}`; unknown sources count as DELETED. */
  statuses(
    sources: readonly ReputationSourceRef[],
  ): Promise<ReadonlyMap<string, ReputationSourceStatus>>;
}

export const REPUTATION_SOURCE_READER = Symbol('REPUTATION_SOURCE_READER');

export function reputationSourceKey(source: ReputationSourceRef): string {
  return `${source.type}:${source.id}`;
}
