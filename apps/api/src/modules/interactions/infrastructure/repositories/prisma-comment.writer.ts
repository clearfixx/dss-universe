/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-comment.writer.ts
 *
 * 🎯 Purpose:
 * Preserves owned comment/revision/mention/evidence writes inside a root-supplied transaction.
 *
 * 🧠 Responsibilities:
 * • writes comment state atomically with Audit and Outbox records;
 * • serializes revision numbering per comment;
 * • removes deleted bodies from the public domain projection.
 *
 * 🏗️ Architecture:
 * Stateless infrastructure-only writer; root binds recipient lookup to this same transaction.
 *
 * ⚠️ Important:
 * No Users/Auth SQL, business callback contract, transaction lifetime or new isolation policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type {
  Comment,
  CreateComment,
  EditCommentContent,
} from '../../domain/types/comment.type';
import { PrismaInteractionTargetWriter } from './prisma-interaction-target.writer';

import { mapPersistedComment } from '../mappers/comment.mapper';

const PRODUCER = 'dss.api.comments';

export type CommentRecipientResolver = (
  usernames: readonly string[],
  authorId: string,
) => Promise<readonly string[]>;

@Injectable()
export class PrismaCommentWriter {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    private readonly targets: PrismaInteractionTargetWriter,
  ) {}

  async create(
    transaction: Prisma.TransactionClient,
    input: CreateComment,
    resolveRecipients: CommentRecipientResolver,
  ): Promise<Comment> {
    const { mentionedUsernames, documentJson, ...commentData } = input;
    const commentId = randomUUID();
    const reactionTargetId = randomUUID();
    await this.targets.register(transaction, {
      id: reactionTargetId,
      kind: 'comment',
      ownerModule: 'interactions',
      ownerType: 'Comment',
      ownerId: commentId,
      actorId: input.authorId,
    });
    const comment = await transaction.comment.create({
      data: {
        id: commentId,
        reactionTargetId,
        ...commentData,
        document: this.parseDocument(documentJson),
      },
    });
    await transaction.commentRevision.create({
      data: {
        commentId: comment.id,
        version: 1,
        body: input.body,
        document: this.parseDocument(input.documentJson),
        searchText: input.searchText,
        editorId: input.authorId,
      },
    });
    const mentionedUserIds = await this.syncMentions(
      transaction,
      comment,
      input.authorId,
      await resolveRecipients(mentionedUsernames, comment.authorId),
    );
    await this.record(transaction, comment, input.authorId, 'created', null);
    return mapPersistedComment(comment, mentionedUserIds);
  }

  async edit(
    transaction: Prisma.TransactionClient,
    commentId: string,
    editorId: string,
    content: EditCommentContent,
    resolveRecipients: CommentRecipientResolver,
  ): Promise<Comment> {
    await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${commentId}))
      `;
    await transaction.comment.findUniqueOrThrow({
      where: { id: commentId },
    });
    const latest = await transaction.commentRevision.aggregate({
      where: { commentId },
      _max: { version: true },
    });
    const comment = await transaction.comment.update({
      where: { id: commentId },
      data: {
        body: content.body,
        document: this.parseDocument(content.documentJson),
        searchText: content.searchText,
        editedAt: new Date(),
      },
    });
    await transaction.commentRevision.create({
      data: {
        commentId,
        version: (latest._max.version ?? 0) + 1,
        body: content.body,
        document: this.parseDocument(content.documentJson),
        searchText: content.searchText,
        editorId,
      },
    });
    const mentionedUserIds = await this.syncMentions(
      transaction,
      comment,
      editorId,
      await resolveRecipients(content.mentionedUsernames, comment.authorId),
    );
    await this.record(transaction, comment, editorId, 'edited', null);
    return mapPersistedComment(comment, mentionedUserIds);
  }

  async tombstone(
    transaction: Prisma.TransactionClient,
    commentId: string,
    actorId: string,
    reason: string | null,
  ): Promise<Comment> {
    const comment = await transaction.comment.update({
      where: { id: commentId },
      data: {
        body: null,
        document: Prisma.DbNull,
        searchText: null,
        deletedAt: new Date(),
        deletedById: actorId,
        deleteReason: reason,
      },
    });
    await this.syncMentions(transaction, comment, actorId, []);
    await this.record(transaction, comment, actorId, 'tombstoned', reason);
    return mapPersistedComment(comment);
  }

  private async record(
    transaction: Parameters<AuditWriterService['append']>[0],
    comment: {
      id: string;
      interactionTargetId: string;
      reactionTargetId: string;
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
      reactionTargetId: string;
      authorId: string;
    },
    actorId: string,
    recipientIds: readonly string[],
  ): Promise<string[]> {
    const desiredIds = new Set(recipientIds);
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

  private parseDocument(documentJson: string): Prisma.InputJsonValue {
    return JSON.parse(documentJson) as Prisma.InputJsonValue;
  }
}

/**
 * A tombstone is quiet; Audit and Outbox make sure it is never mysterious.
 */
