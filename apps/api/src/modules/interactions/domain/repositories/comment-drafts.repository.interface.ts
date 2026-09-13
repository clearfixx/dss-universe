/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/comment-drafts.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the persistence boundary for Comments-owned editor drafts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  CommentDraft,
  SaveCommentDraft,
} from '../types/comment-draft.type';

export const COMMENT_DRAFTS_REPOSITORY = Symbol('COMMENT_DRAFTS_REPOSITORY');

export interface CommentDraftsRepository {
  save(input: SaveCommentDraft): Promise<CommentDraft | null>;
  findById(id: string): Promise<CommentDraft | null>;
  findByScope(authorId: string, scopeKey: string): Promise<CommentDraft | null>;
  listByAuthor(authorId: string, limit: number): Promise<CommentDraft[]>;
  delete(id: string, authorId: string): Promise<boolean>;
}

/** Optimistic versions stop two tabs from silently rewriting one another. */
