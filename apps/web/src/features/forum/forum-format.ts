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

export const FORUM_REPLY_EDIT_WINDOW_MS = 10 * 60 * 1000;

/** Mirrors the API rule so the button only shows when editing can succeed. */
export function canEditForumPost(input: {
  viewerId: string | null;
  moderator: boolean;
  topicState: string;
  curatorId: string | null;
  post: { number: number; authorId: string | null; createdAt: string };
  now?: number;
}): boolean {
  if (!input.viewerId) return false;
  if (input.moderator) return true;
  if (input.post.number === 1) {
    if (input.curatorId !== null) return input.curatorId === input.viewerId;
    return (
      input.post.authorId === input.viewerId && input.topicState === "OPEN"
    );
  }
  return (
    input.post.authorId === input.viewerId &&
    input.topicState === "OPEN" &&
    (input.now ?? Date.now()) - new Date(input.post.createdAt).getTime() <=
      FORUM_REPLY_EDIT_WINDOW_MS
  );
}
