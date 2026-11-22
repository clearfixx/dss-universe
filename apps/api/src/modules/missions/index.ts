/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions
 * 📄 File: apps/api/src/modules/missions/index.ts
 *
 * 🎯 Purpose:
 * Public surface: the module and its consumer-owned metric port.
 *
 * ⚠️ Important:
 * Infrastructure stays private.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { MissionsModule } from './missions.module';
export {
  MISSION_METRIC_READER,
  type MissionMetricReader,
} from './contracts/mission-metric.contract';
export type { MissionMetric } from './domain/mission.rules';
