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

export const FORUM_TOPIC_SORTS = [
  'LAST_ACTIVITY',
  'NEW',
  'HOT',
  'TOP',
] as const;
export type ForumTopicSort = (typeof FORUM_TOPIC_SORTS)[number];

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
