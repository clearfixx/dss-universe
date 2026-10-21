/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/contracts/comment-count-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the scalar count of an author's non-tombstoned comments.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const COMMENT_COUNT_READER = Symbol('COMMENT_COUNT_READER');
export interface CommentCountReader {
  countByAuthor(authorId: string): Promise<number>;
}
