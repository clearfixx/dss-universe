/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/mission-metric.adapter.ts
 *
 * 🎯 Purpose:
 * Binds the Missions MISSION_METRIC_READER port to the Forum and Reputation
 * owners' published window readers.
 *
 * ⚠️ Important:
 * No owner tables are read here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  FORUM_CONTRIBUTION_TOTALS,
  type ForumContributionTotalsReader,
} from '@api/modules/forum';
import type { MissionMetric, MissionMetricReader } from '@api/modules/missions';
import {
  REPUTATION_TOTAL_READER,
  type ReputationTotalReader,
} from '@api/modules/reputation';

@Injectable()
export class MissionMetricAdapter implements MissionMetricReader {
  constructor(
    @Inject(FORUM_CONTRIBUTION_TOTALS)
    private readonly forum: ForumContributionTotalsReader,
    @Inject(REPUTATION_TOTAL_READER)
    private readonly reputation: ReputationTotalReader,
  ) {}

  async progress(
    subjectId: string,
    metric: MissionMetric,
    since: Date,
    until: Date,
  ): Promise<number> {
    if (metric === 'REPUTATION') {
      return this.reputation.earnedBetween(subjectId, since, until);
    }
    const totals = await this.forum.totalsBetween(subjectId, since, until);
    if (metric === 'TOPICS') return totals.topics;
    if (metric === 'REPLIES') return totals.replies;
    return totals.acceptedAnswers;
  }
}
