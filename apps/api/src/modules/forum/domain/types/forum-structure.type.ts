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
  /** Audience keys such as `role:moderator` and `group:premium`. */
  audienceKeys: readonly string[];
  /** Holders of forum.structure.manage see every category. */
  seesAllCategories: boolean;
  moderatesAllCategories: boolean;
  canAssignModerators: boolean;
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
};

export type ForumModeratorAssignmentRecord = {
  id: string;
  categoryId: string;
  moderatorId: string;
  assignedById: string;
  assignedAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
};
