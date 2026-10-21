import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';
import type { AudienceEngagementRepository } from '../../domain/repositories/audience-engagement.repository.interface';
import {
  SHARE_CHANNELS,
  type AudienceEngagementResult,
  type ShareChannel,
} from '../../domain/types/audience-engagement.type';

@Injectable()
export class PrismaAudienceEngagementRepository implements AudienceEngagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  recordView(
    targetId: string,
    viewerKey: string,
    actorId?: string,
  ): Promise<AudienceEngagementResult> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.interactionView.createMany({
        data: [{ interactionTargetId: targetId, viewerKey, actorId }],
        skipDuplicates: true,
      });
      return this.summary(transaction, targetId, result.count === 1);
    });
  }

  recordShare(
    targetId: string,
    channel: ShareChannel,
    viewerKey: string,
    actorId?: string,
  ): Promise<AudienceEngagementResult> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.interactionShare.createMany({
        data: [
          {
            interactionTargetId: targetId,
            viewerKey,
            actorId,
            channel,
          },
        ],
        skipDuplicates: true,
      });
      return this.summary(transaction, targetId, result.count === 1);
    });
  }

  private async summary(
    transaction: Prisma.TransactionClient,
    targetId: string,
    changed: boolean,
  ): Promise<AudienceEngagementResult> {
    const [viewCount, shareCount, groups] = await Promise.all([
      transaction.interactionView.count({
        where: { interactionTargetId: targetId },
      }),
      transaction.interactionShare.count({
        where: { interactionTargetId: targetId },
      }),
      transaction.interactionShare.groupBy({
        by: ['channel'],
        where: { interactionTargetId: targetId },
        _count: { _all: true },
      }),
    ]);
    const counts = new Map(
      groups.map((group) => [group.channel, group._count._all]),
    );
    return {
      changed,
      viewCount,
      shareCount,
      shares: SHARE_CHANNELS.map((channel) => ({
        channel,
        count: counts.get(channel) ?? 0,
      })),
    };
  }
}
