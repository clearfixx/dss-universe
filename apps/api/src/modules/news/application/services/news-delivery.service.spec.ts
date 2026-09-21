import { BadRequestException } from '@nestjs/common';

import type { NewsDeliveryRepository } from '../../domain/repositories/news-delivery.repository.interface';
import type { ShortNewsItem } from '../../domain/types/short-news.type';
import { NewsDeliveryService } from './news-delivery.service';

describe('NewsDeliveryService', () => {
  let repository: jest.Mocked<NewsDeliveryRepository>;
  let browseShort: jest.Mock;
  let browseShortNumbered: jest.Mock;
  let service: NewsDeliveryService;
  const item = {
    id: 'article-1',
    publishedAt: new Date('2026-09-21T12:00:00.000Z'),
  } as ShortNewsItem;

  beforeEach(() => {
    browseShort = jest.fn().mockResolvedValue({
      items: [item],
      hasNextPage: false,
    });
    browseShortNumbered = jest.fn().mockResolvedValue({
      items: [item],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    repository = {
      browseShort,
      browseShortNumbered,
      chronologicalNavigation: jest.fn(),
    };
    service = new NewsDeliveryService(repository);
  });

  it('supports numbered pages for page selectors and manual input', async () => {
    await service.browseNumbered({ page: 3, pageSize: 15, language: 'uk' });
    expect(browseShortNumbered).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, pageSize: 15, language: 'uk' }),
    );
  });

  it('bounds filters and returns an opaque stable cursor', async () => {
    const result = await service.browseShort({
      first: 500,
      language: 'uk',
      categorySlug: ' Development ',
      search: ' station ',
    });
    expect(browseShort).toHaveBeenCalledWith(
      expect.objectContaining({
        first: 50,
        language: 'uk',
        categorySlug: 'development',
        search: 'station',
      }),
    );
    expect(result.endCursor).toEqual(expect.any(String));
  });

  it('decodes a previously returned cursor', async () => {
    const first = await service.browseShort();
    await service.browseShort({ after: first.endCursor ?? undefined });
    expect(browseShort).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { publishedAt: item.publishedAt, id: item.id },
      }),
    );
  });

  it('rejects malformed cursors and filters', async () => {
    await expect(
      service.browseShort({ after: 'not-a-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.browseShort({ language: 'UKRAINIAN' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(browseShort).not.toHaveBeenCalled();
  });
});
