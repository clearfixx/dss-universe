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

const RELATIVE = new Intl.RelativeTimeFormat("uk-UA", { numeric: "auto" });

/** "5 хв тому" style age of a timestamp, for topic lists. */
export function forumAgo(value: unknown, now = Date.now()): string {
  const minutes = Math.round((now - new Date(String(value)).getTime()) / 60000);
  if (minutes < 60) return RELATIVE.format(-Math.max(minutes, 0), "minute");
  if (minutes < 1440) return RELATIVE.format(-Math.round(minutes / 60), "hour");
  return RELATIVE.format(-Math.round(minutes / 1440), "day");
}

/** Ukrainian plural: forumPlural(3, ["тема", "теми", "тем"]) → "теми". */
export function forumPlural(
  count: number,
  [one, few, many]: readonly [string, string, string],
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Counter style from the mockups: 980, 12.4K, 1.2M. */
export function forumCount(value: number): string {
  return COMPACT.format(value);
}

const CLOCK = new Intl.DateTimeFormat("uk-UA", {
  hour: "2-digit",
  minute: "2-digit",
});
const DAY = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
});

/** "сьогодні, 11:47" / "вчора, 18:06" / "10 жовт., 09:14" for list rows. */
export function forumWhen(value: unknown, now = new Date()): string {
  const date = new Date(String(value));
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const days = Math.ceil((start.getTime() - date.getTime()) / 86_400_000);
  const clock = CLOCK.format(date);
  if (days <= 0) return `сьогодні, ${clock}`;
  if (days === 1) return `вчора, ${clock}`;
  return `${DAY.format(date)}, ${clock}`;
}
