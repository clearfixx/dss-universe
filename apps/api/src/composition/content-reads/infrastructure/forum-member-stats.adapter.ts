/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/forum-member-stats.adapter.ts
 *
 * 🎯 Purpose:
 * Binds Forum's FORUM_MEMBER_STATS port to the owners of reputation totals
 * and current levels, through their published batch readers.
 *
 * ⚠️ Important:
 * Two queries per batch (one per owner); no owner tables are read here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type {
  ForumMemberStanding,
  ForumMemberStatsReader,
} from '@api/modules/forum';
import {
  LEVEL_CURRENT_READER,
  type LevelCurrentReader,
} from '@api/modules/levels';
import {
  REPUTATION_TOTAL_READER,
  type ReputationTotalReader,
} from '@api/modules/reputation';

@Injectable()
export class ForumMemberStatsAdapter implements ForumMemberStatsReader {
  constructor(
    @Inject(REPUTATION_TOTAL_READER)
    private readonly reputation: ReputationTotalReader,
    @Inject(LEVEL_CURRENT_READER)
    private readonly levels: LevelCurrentReader,
  ) {}

  async standings(
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, ForumMemberStanding>> {
    if (ids.length === 0) return new Map();
    const [totals, levels] = await Promise.all([
      this.reputation.totalsFor(ids),
      this.levels.levelsFor(ids),
    ]);
    return new Map(
      ids.map((id) => [
        id,
        { reputation: totals.get(id) ?? 0, level: levels.get(id) ?? 0 },
      ]),
    );
  }
}
