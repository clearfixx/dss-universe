/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions
 * 📄 File: apps/api/src/modules/missions/contracts/mission-metric.contract.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port: how much of a metric one member achieved in a time
 * window. Bound in composition to the Forum and Reputation owners.
 *
 * ⚠️ Important:
 * Missions never read forum or reputation tables directly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { MissionMetric } from '../domain/mission.rules';

export interface MissionMetricReader {
  progress(
    subjectId: string,
    metric: MissionMetric,
    since: Date,
    until: Date,
  ): Promise<number>;
}

export const MISSION_METRIC_READER = Symbol('MISSION_METRIC_READER');
