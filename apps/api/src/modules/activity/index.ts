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
  ACTIVITY_VIEWER_CONTEXT,
  type ActivityViewerContextReader,
  type ActivityViewerContext,
} from './domain/ports/activity-viewer-context.interface';
export {
  ACTIVITY_SUBJECT_VISIBILITY,
  type ActivitySubjectRef,
  type ActivitySubjectVisibilityReader,
} from './domain/ports/activity-subject-visibility.interface';
export {
  ACTOR_ACTIVITY_READER,
  type ActorActivityReader,
  type ActorActivitySummary,
} from './contracts/actor-activity-reader.contract';

/**
 * Keep the public barrel smaller than the feed it serves.
 */
