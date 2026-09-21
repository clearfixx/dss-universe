import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { PermissionsService } from '@api/core/authorization';
import type { NewsLinksRepository } from '../../domain/repositories/news-links.repository.interface';
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import { NewsLinksService } from './news-links.service';

describe('NewsLinksService', () => {
  let links: jest.Mocked<NewsLinksRepository>;
  let news: jest.Mocked<NewsRepository>;
  let createLink: jest.Mock;
  let access: jest.Mock;
  let permissions: Pick<PermissionsService, 'getAccessProfileByUserId'>;
  let service: NewsLinksService;

  beforeEach(() => {
    createLink = jest.fn();
    links = {
      create: createLink,
      list: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
    };
    news = {
      createDraft: jest.fn(),
      findById: jest.fn().mockResolvedValue({ status: 'PUBLISHED' }),
      findBySlug: jest.fn(),
      saveDraft: jest.fn(),
    };
    access = jest.fn().mockResolvedValue({ roles: [], permissions: [] });
    permissions = { getAccessProfileByUserId: access };
    service = new NewsLinksService(
      links,
      news,
      permissions as PermissionsService,
    );
  });

  it('denies SEO mutations without permission', async () => {
    await expect(
      service.create('actor-1', {
        sourceArticleId: 'article-1',
        targetArticleId: 'article-2',
        type: 'RELATED',
        anchorText: 'Related guide',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects self-links before persistence', async () => {
    access.mockResolvedValue({ roles: [], permissions: ['news.links.manage'] });
    await expect(
      service.create('actor-1', {
        sourceArticleId: 'article-1',
        targetArticleId: 'article-1',
        type: 'RELATED',
        anchorText: 'Self',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createLink).not.toHaveBeenCalled();
  });
});
