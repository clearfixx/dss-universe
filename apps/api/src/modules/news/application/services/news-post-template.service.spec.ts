import { BadRequestException } from '@nestjs/common';

import type { NewsArticle } from '../../domain/types/news-article.type';
import { NewsPostTemplateService } from './news-post-template.service';

describe('NewsPostTemplateService', () => {
  const service = new NewsPostTemplateService();
  const article = {
    coverMediaId: 'cover-1',
    plainText: 'Complete article text.',
  } as NewsArticle;

  it('normalizes and de-duplicates gallery media', () => {
    expect(
      service.normalize('GALLERY', {
        imageMediaIds: [' image-1 ', 'image-2', 'image-1'],
      }),
    ).toEqual({ imageMediaIds: ['image-1', 'image-2'] });
  });

  it('requires at least three gallery images for submission', () => {
    expect(() =>
      service.assertReady({
        ...article,
        postType: 'GALLERY',
        templateData: { imageMediaIds: ['image-1', 'image-2'] },
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts a complete HTTPS video source', () => {
    expect(() =>
      service.assertReady({
        ...article,
        postType: 'VIDEO',
        templateData: {
          sourceType: 'EXTERNAL_URL',
          url: 'https://video.example/watch/1',
        },
      }),
    ).not.toThrow();
  });

  it('rejects an insecure external audio source', () => {
    expect(() =>
      service.normalize('AUDIO', {
        sourceType: 'EXTERNAL_URL',
        url: 'http://audio.example/track/1',
      }),
    ).toThrow(BadRequestException);
  });
});
