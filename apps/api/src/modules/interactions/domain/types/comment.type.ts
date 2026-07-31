/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/comment.type.ts
 *
 * 🎯 Purpose:
 * Defines shared comment, reply, revision and tombstone contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type Comment = {
  id: string;
  interactionTargetId: string;
  authorId: string;
  parentId: string | null;
  mentionedUserIds: string[];
  body: string | null;
  isDeleted: boolean;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CommentRevision = {
  id: string;
  commentId: string;
  version: number;
  body: string;
  editorId: string;
  createdAt: Date;
};

export type CreateComment = {
  interactionTargetId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  mentionedUsernames: string[];
};

/**
 * A reply belongs to the same target as its parent. Family reunions stay local.
 */
