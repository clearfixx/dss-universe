/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/bookmark.type.ts
 *
 * 🎯 Purpose:
 * Defines private saved-item relationships and mutation results.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

export type Bookmark = {
  id: string;
  interactionTargetId: string;
  ownerId: string;
  createdAt: Date;
};

export type BookmarkMutationResult = {
  bookmark: Bookmark | null;
  saved: boolean;
  changed: boolean;
};

export type BookmarkPage = PaginatedResult<Bookmark>;

/**
 * The relationship is private. The target content keeps its own access policy.
 */
