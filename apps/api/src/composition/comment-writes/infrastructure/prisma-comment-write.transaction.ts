/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comment Write Composition
 * 📄 File: apps/api/src/composition/comment-writes/infrastructure/prisma-comment-write.transaction.ts
 *
 * 🎯 Purpose:
 * Binds owned comment writes and single-statement recipient resolution to one existing transaction.
 *
 * 🧠 Responsibilities:
 * • opens default-isolation create/edit/tombstone units without new budgets;
 * • binds the infrastructure-only recipient callback to the same explicit client.
 *
 * 🏗️ Architecture:
 * Root unit of work implementing the Interactions-owned semantic port; no owned SQL copied here.
 *
 * ⚠️ Important:
 * Provider failures roll back all comment/target/revision/mention/audit/outbox state.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  CommentWriteTransaction,
  CreateComment,
  EditCommentContent,
} from '@api/modules/interactions';
import { PrismaCommentWriter } from '@api/modules/interactions/infrastructure';
import { PrismaMentionRecipientResolver } from './prisma-mention-recipient.resolver';

@Injectable()
export class PrismaCommentWriteTransaction implements CommentWriteTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comments: PrismaCommentWriter,
    private readonly recipients: PrismaMentionRecipientResolver,
  ) {}

  create(input: CreateComment) {
    return this.prisma.$transaction((transaction) =>
      this.comments.create(transaction, input, (names, authorId) =>
        this.recipients.resolve(transaction, names, authorId),
      ),
    );
  }

  edit(commentId: string, editorId: string, content: EditCommentContent) {
    return this.prisma.$transaction((transaction) =>
      this.comments.edit(
        transaction,
        commentId,
        editorId,
        content,
        (names, authorId) =>
          this.recipients.resolve(transaction, names, authorId),
      ),
    );
  }

  tombstone(commentId: string, actorId: string, reason: string | null) {
    return this.prisma.$transaction((transaction) =>
      this.comments.tombstone(transaction, commentId, actorId, reason),
    );
  }
}

/**
 * One airlock, one transaction. Please do not send half the crew through a pre-read. 🛰️
 */
