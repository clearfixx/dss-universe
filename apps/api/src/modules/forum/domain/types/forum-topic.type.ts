/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/types/forum-topic.type.ts
 *
 * 🎯 Purpose:
 * Owner-local vocabulary for topics, posts and revisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const FORUM_TOPIC_KINDS = ['DISCUSSION', 'QUESTION'] as const;
export type ForumTopicKind = (typeof FORUM_TOPIC_KINDS)[number];

export const FORUM_TOPIC_STATES = [
  'OPEN',
  'CLOSED',
  'ARCHIVED',
  'TRASHED',
] as const;
export type ForumTopicState = (typeof FORUM_TOPIC_STATES)[number];

export const FORUM_POST_STATES = [
  'VISIBLE',
  'HIDDEN',
  'DELETED',
  'PURGED',
] as const;
export type ForumPostState = (typeof FORUM_POST_STATES)[number];

export const FORUM_STAFF_ROLES = [
  'CURATOR',
  'MODERATOR',
  'SUPERMODERATOR',
  'ADMINISTRATOR',
] as const;
export type ForumStaffRole = (typeof FORUM_STAFF_ROLES)[number];

export const FORUM_TOPIC_SCOPES = ['ACTIVE', 'ARCHIVED', 'TRASHED'] as const;
export type ForumTopicScope = (typeof FORUM_TOPIC_SCOPES)[number];

/**
 * Topic list filters: MINE = authored by the viewer; NO_REPLIES = nobody has
 * replied yet; UNSOLVED = questions without an accepted answer.
 */
export const FORUM_TOPIC_FILTERS = [
  'ALL',
  'MINE',
  'NO_REPLIES',
  'UNSOLVED',
] as const;
export type ForumTopicFilter = (typeof FORUM_TOPIC_FILTERS)[number];

/** Cross-forum personal lists of the signed-in viewer. */
export const FORUM_VIEWER_COLLECTIONS = [
  'AUTHORED',
  'SUBSCRIBED',
  'FOLLOWED_SECTIONS',
] as const;
export type ForumViewerCollection = (typeof FORUM_VIEWER_COLLECTIONS)[number];

/** Topic counts of one section for the filter panel and its header. */
export type ForumTopicFacets = {
  total: number;
  questions: number;
  discussions: number;
  accepted: number;
  unsolved: number;
  noReplies: number;
  closed: number;
  archived: number;
  mine: number | null;
  participants: number;
};

export const FORUM_TOPIC_SORTS = [
  'LAST_ACTIVITY',
  'NEW',
  'HOT',
  'TOP',
] as const;
export type ForumTopicSort = (typeof FORUM_TOPIC_SORTS)[number];

/**
 * Order of replies inside a topic. The first post always opens page 1;
 * BEST = net rating (up − down), ties by post number.
 */
export const FORUM_REPLY_SORTS = ['OLDEST', 'NEWEST', 'BEST'] as const;
export type ForumReplySort = (typeof FORUM_REPLY_SORTS)[number];

/** Owner decisions: reply edit window and global posting cooldown. */
export const FORUM_REPLY_EDIT_WINDOW_MS = 10 * 60 * 1000;
export const FORUM_POSTING_COOLDOWN_SECONDS = 60;

export type ForumTopicSummary = {
  id: string;
  forumId: string;
  interactionTargetId: string;
  authorId: string;
  kind: ForumTopicKind;
  title: string;
  state: ForumTopicState;
  pinned: boolean;
  curatorId: string | null;
  postCount: number;
  lastPostNumber: number;
  lastPostAt: Date;
  lastPostAuthorId: string;
  createdAt: Date;
  ratingUp: number;
  ratingDown: number;
  viewCount: number;
  /** Furthest post number the viewer has read; null for guests. */
  viewerLastReadNumber: number | null;
  acceptedAnswerPostId: string | null;
  /** Set when this topic was merged; clients redirect to the target. */
  mergedIntoTopicId: string | null;
  /** Trash metadata; null unless the topic is in the trash. */
  trashedAt: Date | null;
  trashedById: string | null;
  tags: Array<{ id: string; slug: string; label: string }>;
};

export type ForumPostView = {
  id: string;
  topicId: string;
  number: number;
  authorId: string;
  state: ForumPostState;
  /** Null when the viewer may not see the content (tombstones). */
  documentJson: string | null;
  replyToNumber: number | null;
  quotedNumbers: number[];
  revision: number;
  ratingUp: number;
  ratingDown: number;
  createdAt: Date;
  editedAt: Date | null;
  /** Moderation facts, returned only to staff of the topic. */
  moderation: {
    at: Date;
    byId: string;
    reason: string;
  } | null;
  staffNotes: ForumStaffNoteView[];
};

export type ForumStaffNoteView = {
  id: string;
  authorId: string;
  role: ForumStaffRole;
  body: string;
  createdAt: Date;
};

export type ForumPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type ForumPostActor = {
  id: string;
  /** Moderator scope in the topic's category (assignment or supermoderator). */
  moderator: boolean;
};

/** One moderator action on a topic or post (moderator area overview). */
export type ForumModerationActionView = {
  id: string;
  /** e.g. "post.hidden", "topic.trashed". */
  action: string;
  actorId: string | null;
  topicId: string;
  topicTitle: string;
  postNumber: number | null;
  occurredAt: Date;
};

export type ForumModerationOverview = {
  /** Supermoderators and admins moderate every section. */
  allSections: boolean;
  sections: Array<{ id: string; title: string }>;
  trashCount: number;
  recentActions: ForumModerationActionView[];
};
