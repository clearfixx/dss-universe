/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/application/services/activity-feed-ranker.service.ts
 *
 * 🎯 Purpose:
 * Ranks owned activity candidates using minimal viewer context and a fixed read timestamp.
 *
 * 🧠 Responsibilities:
 * • preserves reason precedence, rounded age-weighted scores and deterministic ties;
 * • paginates after ranking and counts unread across every bounded candidate.
 *
 * 🏗️ Architecture:
 * Private Activity application policy; repositories retain only persistence projection.
 *
 * ⚠️ Important:
 * Keep the 500-candidate cap and existing own/mention/following/interest precedence unchanged.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type {
  ActivityEntry,
  ActivityFeedItem,
  ActivityFeedPage,
  ActivityFeedQuery,
  ActivityFeedReason,
} from '../../domain/types/activity-entry.type';
import type { ActivityViewerContext } from '../../domain/ports/activity-viewer-context.interface';

@Injectable()
export class ActivityFeedRankerService {
  rank(
    records: ActivityEntry[],
    query: ActivityFeedQuery,
    context: ActivityViewerContext,
    lastVisitedAt: Date | null,
    generatedAt: Date,
  ): ActivityFeedPage {
    const followingIds = new Set(context.followingIds);
    const interests = new Set(
      context.interests.map((interest) => interest.toLowerCase()),
    );
    const ranked = records
      .map((record) => {
        const metadata = record.metadata;
        const reason = this.reason(
          record.actorId,
          metadata,
          query.viewerId,
          followingIds,
          interests,
        );
        return {
          id: record.id,
          actorId: record.actorId,
          module: record.module,
          action: record.action,
          subjectType: record.subjectType,
          subjectId: record.subjectId,
          visibility: record.visibility,
          metadata,
          occurredAt: record.occurredAt,
          isUnread: Boolean(
            query.viewerId &&
            (!lastVisitedAt || record.occurredAt > lastVisitedAt),
          ),
          reason,
          score: this.score(reason, record.occurredAt, generatedAt),
        } satisfies ActivityFeedItem;
      })
      .sort((left, right) =>
        right.score !== left.score
          ? right.score - left.score
          : right.occurredAt.getTime() - left.occurredAt.getTime() ||
            right.id.localeCompare(left.id),
      );
    const start = (query.page - 1) * query.limit;
    return {
      items: ranked.slice(start, start + query.limit),
      total: ranked.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(ranked.length / query.limit),
      unreadCount: ranked.filter((item) => item.isUnread).length,
      lastVisitedAt,
      generatedAt,
      recommendationMode: 'DETERMINISTIC',
    };
  }

  private reason(
    actorId: string,
    metadata: ActivityEntry['metadata'],
    viewerId: string | undefined,
    followingIds: Set<string>,
    interests: Set<string>,
  ): ActivityFeedReason {
    if (viewerId && actorId === viewerId) return 'OWN_ACTIVITY';
    if (viewerId && metadata?.mentionedUserId === viewerId) return 'MENTION';
    if (followingIds.has(actorId)) return 'FOLLOWING';
    const tags = typeof metadata?.tags === 'string' ? metadata.tags : '';
    if (
      tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .some((tag) => interests.has(tag))
    ) {
      return 'INTEREST';
    }
    return 'RECENT';
  }

  private score(
    reason: ActivityFeedReason,
    occurredAt: Date,
    generatedAt: Date,
  ): number {
    const weights: Record<ActivityFeedReason, number> = {
      MENTION: 500,
      FOLLOWING: 400,
      INTEREST: 300,
      OWN_ACTIVITY: 200,
      RECENT: 100,
    };
    const ageHours = Math.max(
      0,
      (generatedAt.getTime() - occurredAt.getTime()) / 3_600_000,
    );
    return Math.round((weights[reason] + 100 / (1 + ageHours)) * 1000) / 1000;
  }
}
