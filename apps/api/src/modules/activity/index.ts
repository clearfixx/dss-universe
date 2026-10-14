/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public Activity module API.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { ActivityModule } from './activity.module';
export {
  ACTOR_ACTIVITY_READER,
  type ActorActivityReader,
  type ActorActivitySummary,
} from './contracts/actor-activity-reader.contract';

/**
 * Keep the public barrel smaller than the feed it serves.
 */
