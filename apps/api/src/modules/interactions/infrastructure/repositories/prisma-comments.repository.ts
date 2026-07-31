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
import type { Prisma } from '@prisma/client';

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
      const { mentionedUsernames, ...commentData } = input;
      const comment = await transaction.comment.create({ data: commentData });
      await transaction.commentRevision.create({
        data: {
          commentId: comment.id,
          version: 1,
          body: input.body,
          editorId: input.authorId,
        },
      });
      const mentionedUserIds = await this.syncMentions(
        transaction,
        comment,
        input.authorId,
        mentionedUsernames,
      );
      await this.record(transaction, comment, input.authorId, 'created', null);
      return this.toDomain(comment, mentionedUserIds);
    });
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
      ? this.toDomain(
          comment,
          comment.mentions.map((mention) => mention.recipientId),
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
        this.toDomain(
          comment,
          comment.mentions.map((mention) => mention.recipientId),
        ),
      ),
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
    mentionedUsernames: string[],
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
      const mentionedUserIds = await this.syncMentions(
        transaction,
        comment,
        editorId,
        mentionedUsernames,
      );
      await this.record(
        transaction,
        comment,
        editorId,
        'edited',
        current.body === body
          ? 'Body normalized without semantic change.'
          : null,
      );
      return this.toDomain(comment, mentionedUserIds);
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
      await this.syncMentions(transaction, comment, actorId, []);
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

  private async syncMentions(
    transaction: Prisma.TransactionClient,
    comment: {
      id: string;
      interactionTargetId: string;
      authorId: string;
    },
    actorId: string,
    usernames: string[],
  ): Promise<string[]> {
    const candidates =
      usernames.length === 0
        ? []
        : await transaction.user.findMany({
            where: {
              status: 'ACTIVE',
              id: { not: comment.authorId },
              OR: usernames.map((username) => ({
                username: { equals: username, mode: 'insensitive' as const },
              })),
            },
            select: { id: true, username: true },
            orderBy: { id: 'asc' },
          });
    const desiredIds = this.resolveRecipientIds(
      usernames,
      candidates,
      comment.authorId,
    );
    const existing = await transaction.mention.findMany({
      where: { commentId: comment.id },
      orderBy: { id: 'asc' },
    });

    for (const mention of existing) {
      if (
        mention.retractedAt === null &&
        !desiredIds.has(mention.recipientId)
      ) {
        const retracted = await transaction.mention.update({
          where: { id: mention.id },
          data: { retractedAt: new Date() },
        });
        await this.recordMention(transaction, retracted, actorId, 'retracted');
      }
    }

    const existingByRecipient = new Map(
      existing.map((mention) => [mention.recipientId, mention]),
    );
    for (const recipientId of desiredIds) {
      const current = existingByRecipient.get(recipientId);
      if (current?.retractedAt === null) continue;
      const activatedAt = new Date();
      const mention = current
        ? await transaction.mention.update({
            where: { id: current.id },
            data: { activatedAt, retractedAt: null },
          })
        : await transaction.mention.create({
            data: {
              interactionTargetId: comment.interactionTargetId,
              commentId: comment.id,
              actorId: comment.authorId,
              recipientId,
              activatedAt,
            },
          });
      await this.recordMention(transaction, mention, actorId, 'created');
    }

    return [...desiredIds];
  }

  private resolveRecipientIds(
    usernames: string[],
    candidates: { id: string; username: string }[],
    authorId: string,
  ): Set<string> {
    const recipientIds = new Set<string>();
    for (const username of usernames) {
      const matches = candidates.filter(
        (candidate) =>
          candidate.id !== authorId &&
          candidate.username.localeCompare(username, 'en-US', {
            sensitivity: 'accent',
          }) === 0,
      );
      const exact = matches.find(
        (candidate) => candidate.username === username,
      );
      if (exact) {
        recipientIds.add(exact.id);
      } else if (matches.length === 1 && matches[0]) {
        recipientIds.add(matches[0].id);
      }
    }
    return recipientIds;
  }

  private async recordMention(
    transaction: Prisma.TransactionClient,
    mention: {
      id: string;
      interactionTargetId: string;
      commentId: string;
      actorId: string;
      recipientId: string;
    },
    transitionActorId: string,
    action: 'created' | 'retracted',
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `comments.mention.${action}`,
      actorType: 'USER',
      actorId: transitionActorId,
      targetType: 'Mention',
      targetId: mention.id,
      metadata: {
        commentId: mention.commentId,
        interactionTargetId: mention.interactionTargetId,
        recipientId: mention.recipientId,
      },
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `notifications.mention.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId: mention.actorId,
        aggregate: { type: 'Mention', id: mention.id },
        payload: {
          mentionId: mention.id,
          commentId: mention.commentId,
          interactionTargetId: mention.interactionTargetId,
          actorId: mention.actorId,
          recipientId: mention.recipientId,
        },
      }),
    );
  }

  private toDomain(
    comment: {
      id: string;
      interactionTargetId: string;
      authorId: string;
      parentId: string | null;
      body: string | null;
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
      isDeleted,
    };
  }
}

/**
 * A tombstone is quiet; Audit and Outbox make sure it is never mysterious.
 */
