/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-post-network.ts
 *
 * 🎯 Purpose:
 * Staff access to post network metadata (P1 B11, owner decision D6): read
 * the IP address and User-Agent a post was written from, and erase them.
 *
 * ⚠️ Important:
 * Reads need forum.network.view AND visibility of the post; every read is
 * audited without copying the address into the audit record. Erasing needs
 * forum.network.delete and a reason. No cross-member matching here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { normalizeModerationReason } from '../domain/forum-moderation.rules';
import {
  describeUserAgent,
  type ForumDeviceInfo,
} from '../domain/forum-network.rules';
import { ForumTopicsService } from './prisma-forum-topics';

export type ForumPostNetworkView = {
  postId: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: ForumDeviceInfo;
  capturedAt: Date;
};

@Injectable()
export class ForumPostNetworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    private readonly topics: ForumTopicsService,
  ) {}

  /** Null when nothing was captured (older posts, erased data). */
  async read(
    actorId: string,
    postId: string,
  ): Promise<ForumPostNetworkView | null> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (!viewer.canViewNetwork) this.denied();
    const topicId = await this.visiblePostTopic(postId, viewer);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.forumPostNetwork.findUnique({ where: { postId } });
      await this.audit.append(tx, {
        action: 'forum.post_network_viewed',
        actorType: 'USER',
        actorId,
        targetType: 'ForumPost',
        targetId: postId,
        metadata: { topicId, found: row !== null },
      });
      return row
        ? {
            postId,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            device: describeUserAgent(row.userAgent),
            capturedAt: row.capturedAt,
          }
        : null;
    });
  }

  /** Erases the stored metadata; true when something was removed. */
  async erase(actorId: string, postId: string, reason: string) {
    const viewer = await this.viewers.read(actorId, new Date());
    if (!viewer.canDeleteNetwork) this.denied();
    const why = normalizeModerationReason(reason);
    const topicId = await this.visiblePostTopic(postId, viewer);
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.forumPostNetwork.deleteMany({
        where: { postId },
      });
      await this.audit.append(tx, {
        action: 'forum.post_network_deleted',
        actorType: 'USER',
        actorId,
        targetType: 'ForumPost',
        targetId: postId,
        reason: why,
        metadata: { topicId, removed: removed.count === 1 },
      });
      return removed.count === 1;
    });
  }

  private async visiblePostTopic(
    postId: string,
    viewer: Awaited<ReturnType<ForumViewerFactsReader['read']>>,
  ): Promise<string> {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { topicId: true },
    });
    if (!post) {
      throw new ForumCommandError('NOT_FOUND', 'Post not found.');
    }
    // Same visibility as the thread: a hidden section stays a 404.
    await this.topics.visibleTopic(post.topicId, viewer);
    return post.topicId;
  }

  private denied(): never {
    throw new ForumCommandError(
      'ACCESS_DENIED',
      'Network data is available to moderators only.',
    );
  }
}
