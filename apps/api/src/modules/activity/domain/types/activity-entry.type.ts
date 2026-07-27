/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/domain/types/activity-entry.type.ts
 *
 * 🎯 Purpose:
 * Defines a privacy-safe projected platform activity.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ActivityVisibility = 'PUBLIC' | 'MEMBERS' | 'PRIVATE';

export interface ActivityEntry {
  id: string;
  actorId: string;
  module: string;
  action: string;
  subjectType: string;
  subjectId: string;
  visibility: ActivityVisibility;
  metadata: Record<string, string | number | boolean | null> | null;
  occurredAt: Date;
}

/**
 * Feed entries describe what happened; domain entities retain the real content.
 */
