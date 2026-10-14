/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/domain/ports/activity-viewer-context.interface.ts
 *
 * 🎯 Purpose:
 * Defines Activity-owned personalization input without foreign user records or relationship rows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const ACTIVITY_VIEWER_CONTEXT = Symbol('ACTIVITY_VIEWER_CONTEXT');
export type ActivityViewerContext = Readonly<{
  interests: readonly string[];
  followingIds: readonly string[];
  blockedIds: readonly string[];
}>;
export interface ActivityViewerContextReader {
  readForViewer(viewerId: string): Promise<ActivityViewerContext>;
}
