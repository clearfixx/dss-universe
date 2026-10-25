/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interactions Persistence
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-interaction-delivery.reader.ts
 *
 * 🎯 Purpose:
 * Reads owned engagement, votes, shares and comment trees inside a supplied snapshot.
 *
 * 🧠 Responsibilities:
 * • preserves content reaction counts, viewer signals and root/reply ordering;
 * • reads actor IDs only, never foreign Users display relations;
 * • retains existing nullable tombstone fields without inventing replacement content.
 *
 * 🏗️ Architecture:
 * Stateless infrastructure-only adapter; the content owner authorizes access first.
 *
 * ⚠️ Important:
 * No News policy or profile query belongs here. The existing all-target comment read
 * is preserved, not claimed as a bounded-data algorithm; no hidden result cap is added.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma, ReactionKind } from '@prisma/client';
import { SHARE_CHANNELS } from '../../domain/types/audience-engagement.type';

type CommentEngagement = {
  upvotes: number;
  downvotes: number;
  score: number;
  viewerReaction: 'UPVOTE' | 'DOWNVOTE' | null;
};
export type InteractionDeliveryComment = {
  id: string;
  reactionTargetId: string;
  parentId: string | null;
  authorId: string;
  body: string | null;
  documentJson: string | null;
  isDeleted: boolean;
  editedAt: Date | null;
  createdAt: Date;
  engagement: CommentEngagement;
  children: InteractionDeliveryComment[];
};

@Injectable()
export class PrismaInteractionDeliveryReader {
  async summaries(
    transaction: Prisma.TransactionClient,
    targetIds: readonly string[],
    viewerId?: string,
  ) {
    if (!targetIds.length)
      return new Map<
        string,
        CommentEngagement & {
          viewCount: number;
          commentCount: number;
          bookmarkedByViewer: boolean;
        }
      >();
    const rows = await transaction.interactionTarget.findMany({
      where: { id: { in: [...new Set(targetIds)] } },
      select: {
        id: true,
        reactionAggregate: {
          select: { upvotes: true, downvotes: true, score: true },
        },
        bookmarks: {
          where: viewerId ? { ownerId: viewerId } : { id: '' },
          take: 1,
          select: { id: true },
        },
        reactions: {
          where: viewerId
            ? { actorId: viewerId, kind: { in: ['UPVOTE', 'DOWNVOTE'] } }
            : { id: '' },
          take: 1,
          select: { kind: true },
        },
        _count: {
          select: { comments: { where: { deletedAt: null } }, views: true },
        },
      },
    });
    return new Map(
      rows.map((row) => {
        const kind = row.reactions.at(0)?.kind;
        return [
          row.id,
          {
            viewCount: row._count.views,
            commentCount: row._count.comments,
            upvotes: row.reactionAggregate?.upvotes ?? 0,
            downvotes: row.reactionAggregate?.downvotes ?? 0,
            score: row.reactionAggregate?.score ?? 0,
            bookmarkedByViewer: row.bookmarks.length === 1,
            viewerReaction:
              kind === 'UPVOTE' || kind === 'DOWNVOTE' ? kind : null,
          },
        ];
      }),
    );
  }

  async shares(transaction: Prisma.TransactionClient, targetId: string) {
    const groups = await transaction.interactionShare.groupBy({
      by: ['channel'],
      where: { interactionTargetId: targetId },
      _count: { _all: true },
    });
    const counts = new Map(
      groups.map((group) => [group.channel, group._count._all]),
    );
    return {
      total: groups.reduce((sum, group) => sum + group._count._all, 0),
      channels: SHARE_CHANNELS.map((channel) => ({
        channel,
        count: counts.get(channel) ?? 0,
      })),
    };
  }

  async ratingPage(
    transaction: Prisma.TransactionClient,
    targetId: string,
    page: number,
    pageSize: number,
  ) {
    const where = {
      interactionTargetId: targetId,
      kind: { in: [ReactionKind.UPVOTE, ReactionKind.DOWNVOTE] },
    };
    const rows = await transaction.reaction.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, kind: true, updatedAt: true, actorId: true },
    });
    const total = await transaction.reaction.count({ where });
    return {
      items: rows.map((row) => {
        if (row.kind !== 'UPVOTE' && row.kind !== 'DOWNVOTE')
          throw new Error('Unexpected content vote kind.');
        return { ...row, kind: row.kind };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async commentsPage(
    transaction: Prisma.TransactionClient,
    targetId: string,
    page: number,
    pageSize: number,
    viewerId?: string,
  ) {
    const where = { interactionTargetId: targetId };
    const roots = await transaction.comment.findMany({
      where: { ...where, parentId: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true },
    });
    const total = await transaction.comment.count({
      where: { ...where, parentId: null },
    });
    const rows = await transaction.comment.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        reactionTargetId: true,
        parentId: true,
        authorId: true,
        body: true,
        document: true,
        deletedAt: true,
        editedAt: true,
        createdAt: true,
        reactionTarget: {
          select: {
            reactionAggregate: {
              select: { upvotes: true, downvotes: true, score: true },
            },
            reactions: viewerId
              ? {
                  where: {
                    actorId: viewerId,
                    kind: { in: [ReactionKind.UPVOTE, ReactionKind.DOWNVOTE] },
                  },
                  select: { kind: true },
                  take: 1,
                }
              : false,
          },
        },
      },
    });
    const nodes = new Map<string, InteractionDeliveryComment>();
    for (const row of rows) {
      const aggregate = row.reactionTarget.reactionAggregate;
      const kind = row.reactionTarget.reactions?.at(0)?.kind;
      nodes.set(row.id, {
        id: row.id,
        reactionTargetId: row.reactionTargetId,
        parentId: row.parentId,
        authorId: row.authorId,
        body: row.body,
        documentJson:
          row.document === null ? null : JSON.stringify(row.document),
        isDeleted: Boolean(row.deletedAt),
        editedAt: row.editedAt,
        createdAt: row.createdAt,
        engagement: {
          upvotes: aggregate?.upvotes ?? 0,
          downvotes: aggregate?.downvotes ?? 0,
          score: aggregate?.score ?? 0,
          viewerReaction:
            kind === 'UPVOTE' || kind === 'DOWNVOTE' ? kind : null,
        },
        children: [],
      });
    }
    for (const node of nodes.values())
      if (node.parentId) nodes.get(node.parentId)?.children.push(node);
    return {
      items: roots.flatMap(({ id }) => {
        const node = nodes.get(id);
        return node ? [node] : [];
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
