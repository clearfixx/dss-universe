/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/application/services/news-attachment-delivery.service.ts
 *
 * 🎯 Purpose:
 * Composes full News attachment labels/order from minimal published file metadata.
 *
 * 🧠 Responsibilities:
 * • unwraps the canonical NEWS doc root and skips every contentGate subtree;
 * • preserves first position/last label, duplicate reference resolution and display kind.
 *
 * 🏗️ Architecture:
 * Private News application projection; Media eligibility and binary delivery stay owned.
 *
 * ⚠️ Important:
 * Only eligible referenced files appear; Editor validates public documents before this projection.
 * Provider/JSON failures must not become empty success; legacy component shapes remain compatible.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  NEWS_ATTACHMENT_READER,
  type NewsAttachmentReader,
} from '../../domain/ports/news-attachment-reader.interface';
import type { NewsAttachment } from '../../domain/types/short-news.type';

@Injectable()
export class NewsAttachmentDeliveryService {
  constructor(
    @Inject(NEWS_ATTACHMENT_READER)
    private readonly files: NewsAttachmentReader,
  ) {}

  async project(
    articleId: string,
    documentJson: string,
  ): Promise<NewsAttachment[]> {
    const labels = this.attachmentLabels(JSON.parse(documentJson) as unknown);
    if (labels.size === 0) return [];
    const files = await this.files.read(articleId, [...labels.keys()]);
    const byMediaId = new Map(files.map((file) => [file.mediaId, file]));
    return [...labels].flatMap(([mediaId, label]) => {
      const file = byMediaId.get(mediaId);
      if (!file) return [];
      return [
        {
          id: file.id,
          mediaId,
          label,
          filename: file.filename,
          mimeType: file.mimeType,
          extension: file.extension,
          size: file.size,
          kind: this.fileKind(file.mimeType, file.extension),
          checksumSha256: file.checksumSha256,
          checksumSha1: file.checksumSha1,
          checksumMd5: file.checksumMd5,
          downloadUrl: file.downloadUrl,
        },
      ];
    });
  }

  private attachmentLabels(document: unknown): Map<string, string> {
    const attachments = new Map<string, string>();
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        if (Array.isArray(value))
          value.forEach((child: unknown) => visit(child));
        return;
      }
      const node = value as Record<string, unknown>;
      if (node.type === 'contentGate') return;
      if (node.type === 'attachment' && node.attrs) {
        const attrs = node.attrs as Record<string, unknown>;
        if (
          typeof attrs === 'object' &&
          !Array.isArray(attrs) &&
          typeof attrs.mediaId === 'string' &&
          typeof attrs.label === 'string'
        ) {
          attachments.set(attrs.mediaId, attrs.label);
        }
      }
      if (Array.isArray(node.content))
        node.content.forEach((child: unknown) => visit(child));
    };
    if (
      document &&
      typeof document === 'object' &&
      'profile' in document &&
      document.profile === 'NEWS' &&
      'content' in document &&
      document.content &&
      typeof document.content === 'object' &&
      'type' in document.content &&
      document.content.type === 'doc'
    ) {
      visit(document.content);
    } else {
      visit(document);
    }
    return attachments;
  }

  private fileKind(mimeType: string, extension: string): string {
    if (mimeType === 'application/pdf') return 'PDF document';
    if (mimeType.startsWith('image/'))
      return `${extension.toUpperCase()} image`;
    if (mimeType.startsWith('audio/'))
      return `${extension.toUpperCase()} audio`;
    if (mimeType.startsWith('video/'))
      return `${extension.toUpperCase()} video`;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension.toLowerCase())) {
      return `${extension.toUpperCase()} archive`;
    }
    return `${extension.toUpperCase()} file`;
  }
}
