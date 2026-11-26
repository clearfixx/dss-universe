/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Reference Composition
 * 📄 File: apps/api/src/composition/media-references/infrastructure/forum-post-media.adapter.ts
 *
 * 🎯 Purpose:
 * Binds Forum's FORUM_POST_MEDIA port to Media's attach policy, public
 * attachment reader and the shared reference sync.
 *
 * ⚠️ Important:
 * Scope is (ForumPost, postId, forum.post.media). Only public READY files are
 * delivered, exactly like News attachments.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  MEDIA_ATTACHMENT_POLICY,
  MEDIA_PUBLIC_ATTACHMENT_READER,
  type MediaAttachmentPolicy,
  type MediaPublicAttachmentReader,
} from '@api/modules/media';
import {
  FORUM_POST_MEDIA_PURPOSE,
  type ForumPostAttachment,
  type ForumPostMedia,
  type ForumPostMediaRejection,
} from '@api/modules/forum/infrastructure';
import { syncDocumentMediaReferences } from '../sync-document-media-references';

const scope = (postId: string) => ({
  targetType: 'ForumPost',
  targetId: postId,
  purpose: FORUM_POST_MEDIA_PURPOSE,
});

@Injectable()
export class ForumPostMediaAdapter implements ForumPostMedia {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_ATTACHMENT_POLICY)
    private readonly policy: MediaAttachmentPolicy,
    @Inject(MEDIA_PUBLIC_ATTACHMENT_READER)
    private readonly publicAttachments: MediaPublicAttachmentReader,
  ) {}

  async activeMediaIds(postId: string): Promise<string[]> {
    const rows = await this.prisma.mediaReference.findMany({
      where: { ...scope(postId), removedAt: null },
      select: { mediaId: true },
    });
    return rows.map(({ mediaId }) => mediaId);
  }

  async rejectedForActor(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<readonly ForumPostMediaRejection[]> {
    return (await this.policy.evaluate(actorId, mediaIds)).rejected;
  }

  async files(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<
    ReadonlyArray<{ mediaId: string; extension: string; size: number }>
  > {
    return (await this.policy.evaluate(actorId, mediaIds)).files ?? [];
  }

  sync(
    transaction: TransactionClient,
    postId: string,
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<void> {
    return syncDocumentMediaReferences(
      transaction,
      scope(postId),
      actorId,
      mediaIds,
    );
  }

  async attachments(
    postId: string,
    mediaIds: readonly string[],
  ): Promise<readonly ForumPostAttachment[]> {
    const rows = await this.publicAttachments.read({
      ...scope(postId),
      mediaIds,
    });
    const byId = new Map(rows.map((row) => [row.mediaId, row]));
    return mediaIds.flatMap((mediaId) => {
      const row = byId.get(mediaId);
      return row
        ? [
            {
              mediaId,
              filename: row.filename,
              mimeType: row.mimeType,
              size: row.size,
              downloadUrl: row.downloadUrl,
            },
          ]
        : [];
    });
  }
}
