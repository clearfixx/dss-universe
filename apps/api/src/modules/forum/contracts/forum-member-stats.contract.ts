/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-member-stats.contract.ts
 *
 * 🎯 Purpose:
 * Forum's consumer-owned port for the public standing shown in the post
 * author column (reputation total, current level), bound in composition.
 *
 * ⚠️ Important:
 * Batch only; members absent from the map have zero reputation and level 0.
 * Forum post counts are forum-owned and computed inside the module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumMemberStanding = Readonly<{
  reputation: number;
  level: number;
}>;

export interface ForumMemberStatsReader {
  standings(
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, ForumMemberStanding>>;
}

export const FORUM_MEMBER_STATS = Symbol('FORUM_MEMBER_STATS');
