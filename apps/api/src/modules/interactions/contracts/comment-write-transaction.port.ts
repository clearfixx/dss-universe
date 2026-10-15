/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/contracts/comment-write-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines atomic comment operations without exposing transaction clients or resolver callbacks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  Comment,
  CreateComment,
  EditCommentContent,
} from '../domain/types/comment.type';

export const COMMENT_WRITE_TRANSACTION = Symbol('COMMENT_WRITE_TRANSACTION');
export interface CommentWriteTransaction {
  create(input: CreateComment): Promise<Comment>;
  edit(
    commentId: string,
    editorId: string,
    content: EditCommentContent,
  ): Promise<Comment>;
  tombstone(
    commentId: string,
    actorId: string,
    reason: string | null,
  ): Promise<Comment>;
}
