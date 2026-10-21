import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  NewsArticle,
  NewsPostType,
} from '../../domain/types/news-article.type';

type MediaSource = {
  sourceType: 'DSS_MEDIA' | 'EXTERNAL_URL';
  mediaId?: string;
  url?: string;
};

@Injectable()
export class NewsPostTemplateService {
  normalize(postType: NewsPostType, value: unknown): Record<string, unknown> {
    const data = this.object(value);
    if (postType === 'STANDARD' || postType === 'TEXT') return {};
    if (postType === 'GALLERY') {
      const ids = data.imageMediaIds ?? [];
      if (!Array.isArray(ids) || ids.length > 50) {
        throw new BadRequestException(
          'Gallery template requires a bounded imageMediaIds array.',
        );
      }
      const normalizedIds: string[] = [];
      for (const id of ids as unknown[]) {
        if (typeof id !== 'string' || id.trim().length === 0) {
          throw new BadRequestException(
            'Gallery template requires a bounded imageMediaIds array.',
          );
        }
        normalizedIds.push(id.trim());
      }
      return { imageMediaIds: [...new Set(normalizedIds)] };
    }
    return this.mediaSource(data, postType);
  }

  assertReady(article: NewsArticle): void {
    if (!article.coverMediaId) {
      throw new BadRequestException(
        'A cover image is required before editorial submission.',
      );
    }
    if (!article.plainText.trim()) {
      throw new BadRequestException(
        'Full News content is required before editorial submission.',
      );
    }
    const template = this.normalize(article.postType, article.templateData);
    if (
      article.postType === 'GALLERY' &&
      (template.imageMediaIds as string[]).length < 3
    ) {
      throw new BadRequestException(
        'Gallery News requires at least three images before submission.',
      );
    }
    if (
      (article.postType === 'VIDEO' || article.postType === 'AUDIO') &&
      !this.completeSource(template as MediaSource)
    ) {
      throw new BadRequestException(
        `${article.postType} News requires a complete media source before submission.`,
      );
    }
  }

  private mediaSource(
    data: Record<string, unknown>,
    postType: 'VIDEO' | 'AUDIO',
  ): Record<string, unknown> {
    if (Object.keys(data).length === 0) return {};
    const sourceType = data.sourceType;
    if (sourceType !== 'DSS_MEDIA' && sourceType !== 'EXTERNAL_URL') {
      throw new BadRequestException(`${postType} source type is invalid.`);
    }
    if (sourceType === 'DSS_MEDIA') {
      const mediaId = this.nonEmpty(data.mediaId);
      return mediaId ? { sourceType, mediaId } : { sourceType };
    }
    const url = this.nonEmpty(data.url);
    if (url) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new BadRequestException(`${postType} source URL is invalid.`);
      }
      if (parsed.protocol !== 'https:') {
        throw new BadRequestException(`${postType} source URL must use HTTPS.`);
      }
    }
    return url ? { sourceType, url } : { sourceType };
  }

  private completeSource(source: MediaSource): boolean {
    return source.sourceType === 'DSS_MEDIA'
      ? Boolean(source.mediaId)
      : source.sourceType === 'EXTERNAL_URL' && Boolean(source.url);
  }

  private object(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('News template data must be an object.');
    }
    return value as Record<string, unknown>;
  }

  private nonEmpty(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
