/** One-way owned comment lifetime; never projects deleted text or revisions. */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';

@Injectable()
export class PrismaCommentLifetimeReader {
  async read(transaction: TransactionClient, commentId: string) {
    const row = await transaction.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        interactionTargetId: true,
        parentId: true,
        deletedAt: true,
        deletedById: true,
      },
    });
    return row
      ? {
          ...row,
          qualificationRevision: '1' as const,
          withdrawalRevision: '2' as const,
          contractVersion: 1 as const,
        }
      : null;
  }
}
