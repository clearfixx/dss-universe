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

export type ActivityFeedReason =
  | 'OWN_ACTIVITY'
  | 'MENTION'
  | 'FOLLOWING'
  | 'INTEREST'
  | 'RECENT';

export interface ActivityFeedItem extends ActivityEntry {
  isUnread: boolean;
  reason: ActivityFeedReason;
  score: number;
}

export interface ActivityFeedQuery {
  viewerId?: string;
  modules?: string[];
  page: number;
  limit: number;
}

export interface ActivityFeedPage {
  items: ActivityFeedItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
  lastVisitedAt: Date | null;
  generatedAt: Date;
  recommendationMode: 'DETERMINISTIC';
}

/**
 * Feed entries describe what happened; domain entities retain the real content.
 */
