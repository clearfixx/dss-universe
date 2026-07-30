/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/bookmarks.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for private bookmarks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  BookmarkMutationResult,
  BookmarkPage,
} from '../types/bookmark.type';

export const BOOKMARKS_REPOSITORY = Symbol('BOOKMARKS_REPOSITORY');

export interface BookmarksRepository {
  save(
    interactionTargetId: string,
    ownerId: string,
  ): Promise<BookmarkMutationResult>;
  remove(
    interactionTargetId: string,
    ownerId: string,
  ): Promise<BookmarkMutationResult>;
  list(ownerId: string, page: number, limit: number): Promise<BookmarkPage>;
}

/**
 * Private ownership is part of the query, never a frontend filter.
 */
