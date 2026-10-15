/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-comments.repository.ts
 *
 * 🎯 Purpose:
 * Reads owned comments/revisions and delegates atomic writes through an owned semantic port.
 *
 * 🧠 Responsibilities:
 * • preserves top-level/reply pagination and active mention projections;
 * • keeps existing independent/read-batch behavior and tombstone redaction;
 * • delegates create/edit/tombstone without passing an ORM client into business contracts.
 *
 * 🏗️ Architecture:
 * Owned repository; root infrastructure binds multi-owner write transactions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { PaginatedResult } from '@api/shared';
import type { CommentsRepository } from '../../domain/repositories/comments.repository.interface';
import type {
  Comment,
  CommentRevision,
  CreateComment,
  EditCommentContent,
} from '../../domain/types/comment.type';
import {
  COMMENT_WRITE_TRANSACTION,
  type CommentWriteTransaction,
} from '../../contracts/comment-write-transaction.port';
import { mapPersistedComment } from '../mappers/comment.mapper';

@Injectable()
export class PrismaCommentsRepository implements CommentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COMMENT_WRITE_TRANSACTION)
    private readonly writes: CommentWriteTransaction,
  ) {}

  create(input: CreateComment): Promise<Comment> {
    return this.writes.create(input);
  }

  async findById(id: string): Promise<Comment | null> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        mentions: {
          where: { retractedAt: null },
          select: { recipientId: true },
        },
      },
    });
    return comment
      ? mapPersistedComment(
          comment,
          comment.mentions.map(({ recipientId }) => recipientId),
        )
      : null;
  }

  async list(
    targetId: string,
    parentId: string | null,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Comment>> {
    const where = { interactionTargetId: targetId, parentId };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          mentions: {
            where: { retractedAt: null },
            select: { recipientId: true },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);
    return {
      items: records.map((comment) =>
        mapPersistedComment(
          comment,
          comment.mentions.map(({ recipientId }) => recipientId),
        ),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  edit(
    commentId: string,
    editorId: string,
    content: EditCommentContent,
  ): Promise<Comment> {
    return this.writes.edit(commentId, editorId, content);
  }

  tombstone(
    commentId: string,
    actorId: string,
    reason: string | null,
  ): Promise<Comment> {
    return this.writes.tombstone(commentId, actorId, reason);
  }

  async revisions(commentId: string): Promise<CommentRevision[]> {
    const revisions = await this.prisma.commentRevision.findMany({
      where: { commentId },
      orderBy: [{ version: 'asc' }, { id: 'asc' }],
    });
    return revisions.map((revision) => ({
      ...revision,
      documentJson: JSON.stringify(revision.document),
    }));
  }
}
