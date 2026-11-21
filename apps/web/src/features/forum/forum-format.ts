/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-format.ts
 *
 * 🎯 Purpose:
 * Pure display rules shared by forum screens.
 *
 * ⚠️ Important:
 * Owner decisions: the rating column shows the net score; hovering it shows
 * the "80+ / 10−" breakdown; clicking it opens the voters dialog.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ForumRating = Readonly<{ ratingUp: number; ratingDown: number }>;

export function forumScore(rating: ForumRating): number {
  return rating.ratingUp - rating.ratingDown;
}

/** Tooltip text for the rating column, e.g. "80+ / 10−". */
export function forumRatingBreakdown(rating: ForumRating): string {
  return `${rating.ratingUp}+ / ${rating.ratingDown}−`;
}

export type ForumMemberName = Readonly<{
  username: string;
  displayName?: string | null;
}>;

export function forumMemberName(member: ForumMemberName | null | undefined) {
  if (!member) return "Видалений учасник";
  return member.displayName?.trim() || member.username;
}

/**
 * Posts the viewer has not read yet; null for guests (no read state) and 0
 * when everything was read.
 */
export function forumUnreadCount(topic: {
  lastPostNumber: number;
  viewerLastReadNumber?: number | null;
}): number | null {
  if (topic.viewerLastReadNumber == null) return null;
  return Math.max(0, topic.lastPostNumber - topic.viewerLastReadNumber);
}

/** First post number the viewer has not read, for "jump to unread". */
export function forumFirstUnreadNumber(topic: {
  lastPostNumber: number;
  viewerLastReadNumber?: number | null;
}): number | null {
  const unread = forumUnreadCount(topic);
  return unread ? (topic.viewerLastReadNumber ?? 0) + 1 : null;
}
