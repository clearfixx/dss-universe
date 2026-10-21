/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/infrastructure/recipient-existence.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts an ID-only Users contract to independently owned recipient ports.
 *
 * 🧠 Responsibilities:
 * • forwards only opaque IDs and a boolean existence result;
 *
 * 🏗️ Architecture:
 * Root adapter over a published Users contract.
 *
 * ⚠️ Important:
 * Existence is not eligibility; errors propagate and inactive profiles still exist.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  PROFILE_EXISTENCE_READER,
  type ProfileExistenceReader,
} from '@api/modules/users';
import type { PointsRecipientExistence } from '@api/modules/community-points';
import type { LevelRecipientExistence } from '@api/modules/levels';
import type { AchievementRecipientExistence } from '@api/modules/achievements';
@Injectable()
export class RecipientExistenceAdapter
  implements
    PointsRecipientExistence,
    LevelRecipientExistence,
    AchievementRecipientExistence
{
  constructor(
    @Inject(PROFILE_EXISTENCE_READER)
    private readonly source: ProfileExistenceReader,
  ) {}
  exists(subjectId: string): Promise<boolean> {
    return this.source.exists(subjectId);
  }
}
