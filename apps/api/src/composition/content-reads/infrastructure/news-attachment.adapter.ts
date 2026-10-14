/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/news-attachment.adapter.ts
 *
 * 🎯 Purpose:
 * Binds public Media metadata to the News attachment input with fixed owner coordinates.
 *
 * 🧠 Responsibilities:
 * • fixes NewsArticle/news.attachment reference coordinates;
 * • selects only the existing News attachment fields and copies request IDs.
 *
 * 🏗️ Architecture:
 * Root adapter; Media owns file eligibility and News owns document labels/order.
 *
 * ⚠️ Important:
 * No repository, ORM client or storage coordinate crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_PUBLIC_ATTACHMENT_READER,
  type MediaPublicAttachmentReader,
} from '@api/modules/media';
import type {
  NewsAttachmentReader,
  NewsAttachmentFile,
} from '@api/modules/news';

@Injectable()
export class NewsAttachmentAdapter implements NewsAttachmentReader {
  constructor(
    @Inject(MEDIA_PUBLIC_ATTACHMENT_READER)
    private readonly media: MediaPublicAttachmentReader,
  ) {}

  async read(
    articleId: string,
    mediaIds: readonly string[],
  ): Promise<readonly NewsAttachmentFile[]> {
    const files = await this.media.read({
      targetType: 'NewsArticle',
      targetId: articleId,
      purpose: 'news.attachment',
      mediaIds: [...mediaIds],
    });
    return files.map((file) => ({
      id: file.referenceId,
      mediaId: file.mediaId,
      filename: file.filename,
      mimeType: file.mimeType,
      extension: file.extension,
      size: file.size,
      checksumSha256: file.checksumSha256,
      checksumSha1: file.checksumSha1,
      checksumMd5: file.checksumMd5,
      downloadUrl: file.downloadUrl,
    }));
  }
}
