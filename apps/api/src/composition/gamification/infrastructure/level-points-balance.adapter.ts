/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/infrastructure/level-points-balance.adapter.ts
 *
 * 🎯 Purpose:
 * Translates published Points balance into the Levels-owned scalar read port.
 *
 * 🧠 Responsibilities:
 * • forwards current ledger balance without mutable ledger access;
 *
 * 🏗️ Architecture:
 * Root adapter over the published Community Points scalar reader.
 *
 * ⚠️ Important:
 * No caching or duplicated XP; the Points owner remains authoritative.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  COMMUNITY_POINTS_BALANCE_READER,
  type CommunityPointsBalanceReader,
} from '@api/modules/community-points';
import type { LevelPointsBalanceReader } from '@api/modules/levels';
@Injectable()
export class LevelPointsBalanceAdapter implements LevelPointsBalanceReader {
  constructor(
    @Inject(COMMUNITY_POINTS_BALANCE_READER)
    private readonly source: CommunityPointsBalanceReader,
  ) {}
  balance(subjectId: string): Promise<number> {
    return this.source.balance(subjectId);
  }
}
