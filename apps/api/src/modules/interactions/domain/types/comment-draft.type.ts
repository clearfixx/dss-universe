/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/comment-draft.type.ts
 *
 * 🎯 Purpose:
 * Defines the private, versioned comment draft lifecycle owned by Comments.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type CommentDraft = {
  id: string;
  authorId: string;
  interactionTargetId: string;
  parentId: string | null;
  documentJson: string;
  plainText: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveCommentDraft = {
  authorId: string;
  interactionTargetId: string;
  parentId: string | null;
  scopeKey: string;
  documentJson: string;
  plainText: string;
  baseVersion: number;
};

/** Drafts are private working memory, not published interaction content. */
