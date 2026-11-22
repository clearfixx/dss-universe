/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/types/forum-structure.type.ts
 *
 * 🎯 Purpose:
 * Owner-local vocabulary for categories, forums, visibility and moderator scope.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const FORUM_VISIBILITIES = ['PUBLIC', 'MEMBERS', 'RESTRICTED'] as const;
export type ForumVisibility = (typeof FORUM_VISIBILITIES)[number];

/** Current viewer facts needed by Forum; never cached across requests. */
export type ForumViewerFacts = {
  subjectId: string | null;
  /** Highest forum role (section matrices); guests and members by default. */
  accessRole?: import('../forum-access.rules').ForumAccessRole;
  /** Audience keys such as `role:moderator` and `group:premium`. */
  audienceKeys: readonly string[];
  /** Holders of forum.structure.manage see every category. */
  seesAllCategories: boolean;
  moderatesAllCategories: boolean;
  canAssignModerators: boolean;
  canPurgeContent: boolean;
};

export type ForumCategoryVisibilityRule = {
  visibility: ForumVisibility;
  audienceKeys: readonly string[];
};

export type ForumNode = {
  id: string;
  categoryId: string;
  parentId: string | null;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  active: boolean;
  allowsGatedContent: boolean;
  allowTopics: boolean;
  allowReplies: boolean;
  allowPolls: boolean;
  allowAttachments: boolean;
  listed: boolean;
  searchable: boolean;
  showCounts: boolean;
  pinnedLimit: number | null;
  subforums: ForumNode[];
};

export type ForumCategoryNode = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  active: boolean;
  visibility: ForumVisibility;
  audienceKeys: string[] | null;
  forums: ForumNode[];
};

export type ForumCategoryInput = {
  slug: string;
  title: string;
  description: string | null;
  position: number;
  visibility: ForumVisibility;
  audienceKeys: string[];
  active: boolean;
};

export type ForumInput = {
  categoryId: string;
  parentId: string | null;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  allowsGatedContent: boolean;
  active: boolean;
  /** Section switches; omitted = keep the stored value (defaults on create). */
  allowTopics?: boolean;
  allowReplies?: boolean;
  allowPolls?: boolean;
  allowAttachments?: boolean;
  listed?: boolean;
  searchable?: boolean;
  showCounts?: boolean;
  pinnedLimit?: number | null;
};

export type ForumModeratorAssignmentRecord = {
  id: string;
  categoryId: string;
  /** null = whole category. */
  forumId: string | null;
  moderatorId: string;
  assignedById: string;
  assignedAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
};
