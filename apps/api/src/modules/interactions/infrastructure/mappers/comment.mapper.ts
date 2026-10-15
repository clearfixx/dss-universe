/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Persistence Mapping
 * 📄 File: apps/api/src/modules/interactions/infrastructure/mappers/comment.mapper.ts
 *
 * 🎯 Purpose:
 * Preserves the owned public comment projection and redacts tombstone content on read/write paths.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { Comment } from '../../domain/types/comment.type';

export function mapPersistedComment(
  comment: {
    id: string;
    interactionTargetId: string;
    reactionTargetId: string;
    authorId: string;
    parentId: string | null;
    body: string | null;
    document: Prisma.JsonValue | null;
    searchText: string | null;
    editedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  mentionedUserIds: string[] = [],
): Comment {
  const isDeleted = comment.deletedAt !== null;
  return {
    ...comment,
    mentionedUserIds,
    body: isDeleted ? null : comment.body,
    documentJson:
      isDeleted || comment.document === null
        ? null
        : JSON.stringify(comment.document),
    searchText: isDeleted ? null : comment.searchText,
    isDeleted,
  };
}
