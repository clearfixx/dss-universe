/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/comments.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for shared comments and revisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

import type {
  Comment,
  CommentRevision,
  CreateComment,
} from '../types/comment.type';

export const COMMENTS_REPOSITORY = Symbol('COMMENTS_REPOSITORY');

export interface CommentsRepository {
  create(input: CreateComment): Promise<Comment>;
  findById(id: string): Promise<Comment | null>;
  list(
    targetId: string,
    parentId: string | null,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Comment>>;
  edit(
    commentId: string,
    editorId: string,
    body: string,
    mentionedUsernames: string[],
  ): Promise<Comment>;
  tombstone(
    commentId: string,
    actorId: string,
    reason: string | null,
  ): Promise<Comment>;
  revisions(commentId: string): Promise<CommentRevision[]>;
}

/**
 * Persistence remembers versions; application policy decides who may see them.
 */
