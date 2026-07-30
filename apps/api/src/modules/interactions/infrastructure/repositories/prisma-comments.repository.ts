/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-comments.repository.ts
 *
 * 🎯 Purpose:
 * Persists comments, immutable revisions, tombstones and event evidence.
 *
 * 🧠 Responsibilities:
 * • writes comment state atomically with Audit and Outbox records;
 * • serializes revision numbering per comment;
 * • returns stable top-level or reply pagination;
 * • removes deleted bodies from the public domain projection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type { PaginatedResult } from '@api/shared';

import type { CommentsRepository } from '../../domain/repositories/comments.repository.interface';
import type {
  Comment,
  CommentRevision,
  CreateComment,
} from '../../domain/types/comment.type';

const PRODUCER = 'dss.api.comments';

@Injectable()
export class PrismaCommentsRepository implements CommentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async create(input: CreateComment): Promise<Comment> {
    return this.prisma.$transaction(async (transaction) => {
      const comment = await transaction.comment.create({ data: input });
      await transaction.commentRevision.create({
        data: {
          commentId: comment.id,
          version: 1,
          body: input.body,
          editorId: input.authorId,
        },
      });
      await this.record(transaction, comment, input.authorId, 'created', null);
      return this.toDomain(comment);
    });
  }

  async findById(id: string): Promise<Comment | null> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    return comment ? this.toDomain(comment) : null;
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
      }),
      this.prisma.comment.count({ where }),
    ]);
    return {
      items: records.map((comment) => this.toDomain(comment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async edit(
    commentId: string,
    editorId: string,
    body: string,
  ): Promise<Comment> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${commentId}))
      `;
      const current = await transaction.comment.findUniqueOrThrow({
        where: { id: commentId },
      });
      const latest = await transaction.commentRevision.aggregate({
        where: { commentId },
        _max: { version: true },
      });
      const comment = await transaction.comment.update({
        where: { id: commentId },
        data: { body, editedAt: new Date() },
      });
      await transaction.commentRevision.create({
        data: {
          commentId,
          version: (latest._max.version ?? 0) + 1,
          body,
          editorId,
        },
      });
      await this.record(
        transaction,
        comment,
        editorId,
        'edited',
        current.body === body
          ? 'Body normalized without semantic change.'
          : null,
      );
      return this.toDomain(comment);
    });
  }

  async tombstone(
    commentId: string,
    actorId: string,
    reason: string | null,
  ): Promise<Comment> {
    return this.prisma.$transaction(async (transaction) => {
      const comment = await transaction.comment.update({
        where: { id: commentId },
        data: {
          body: null,
          deletedAt: new Date(),
          deletedById: actorId,
          deleteReason: reason,
        },
      });
      await this.record(transaction, comment, actorId, 'tombstoned', reason);
      return this.toDomain(comment);
    });
  }

  async revisions(commentId: string): Promise<CommentRevision[]> {
    return this.prisma.commentRevision.findMany({
      where: { commentId },
      orderBy: [{ version: 'asc' }, { id: 'asc' }],
    });
  }

  private async record(
    transaction: Parameters<AuditWriterService['append']>[0],
    comment: {
      id: string;
      interactionTargetId: string;
      authorId: string;
      parentId: string | null;
    },
    actorId: string,
    action: 'created' | 'edited' | 'tombstoned',
    reason: string | null,
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `comments.comment.${action}`,
      actorType: 'USER',
      actorId,
      targetType: 'Comment',
      targetId: comment.id,
      reason: reason ?? undefined,
      metadata: {
        interactionTargetId: comment.interactionTargetId,
        parentId: comment.parentId,
      },
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `comments.comment.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'Comment', id: comment.id },
        payload: {
          commentId: comment.id,
          interactionTargetId: comment.interactionTargetId,
          authorId: comment.authorId,
          parentId: comment.parentId,
          reason,
        },
      }),
    );
  }

  private toDomain(comment: {
    id: string;
    interactionTargetId: string;
    authorId: string;
    parentId: string | null;
    body: string | null;
    editedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Comment {
    const isDeleted = comment.deletedAt !== null;
    return {
      ...comment,
      body: isDeleted ? null : comment.body,
      isDeleted,
    };
  }
}

/**
 * A tombstone is quiet; Audit and Outbox make sure it is never mysterious.
 */
