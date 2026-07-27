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

export * from './activity.module';
export * from './application/services/activity-feed.service';
export type { ActivityEntry } from './domain/types/activity-entry.type';

/**
 * Keep the public barrel smaller than the feed it serves.
 */
