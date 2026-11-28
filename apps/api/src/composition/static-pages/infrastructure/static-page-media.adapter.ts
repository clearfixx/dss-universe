/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages Composition
 * 📄 File: apps/api/src/composition/static-pages/infrastructure/static-page-media.adapter.ts
 *
 * 🎯 Purpose:
 * Binds the static page file port to the Media attachment policy and references.
 *
 * ⚠️ Important:
 * Wiring only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  MEDIA_ATTACHMENT_POLICY,
  MEDIA_REFERENCED_FILES,
  type MediaAttachmentPolicy,
  type MediaReferencedFiles,
} from '@api/modules/media';
import {
  STATIC_PAGE_MEDIA_PURPOSE,
  type StaticPageMedia,
} from '@api/modules/static-pages/infrastructure';
import { syncDocumentMediaReferences } from '../../media-references/sync-document-media-references';

const scope = (pageId: string) => ({
  targetType: 'StaticPage',
  targetId: pageId,
  purpose: STATIC_PAGE_MEDIA_PURPOSE,
});

@Injectable()
export class StaticPageMediaAdapter implements StaticPageMedia {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_ATTACHMENT_POLICY)
    private readonly policy: MediaAttachmentPolicy,
    @Inject(MEDIA_REFERENCED_FILES)
    private readonly files: MediaReferencedFiles,
  ) {}

  open(pageId: string, mediaId: string) {
    return this.files.open({ ...scope(pageId), mediaId });
  }

  async referencedIds(pageId: string): Promise<string[]> {
    const rows = await this.prisma.mediaReference.findMany({
      where: { ...scope(pageId), removedAt: null },
      select: { mediaId: true },
    });
    return rows.map(({ mediaId }) => mediaId);
  }

  async rejectedCount(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<number> {
    return (await this.policy.evaluate(actorId, mediaIds)).rejected.length;
  }

  sync(
    transaction: TransactionClient,
    pageId: string,
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<void> {
    return syncDocumentMediaReferences(
      transaction,
      scope(pageId),
      actorId,
      mediaIds,
    );
  }
}
