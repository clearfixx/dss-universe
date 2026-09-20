import { BadRequestException, ConflictException } from '@nestjs/common';
import { createEmptyEditorDocument } from '@dss/editor';

import type { EditorService } from '../../../editor';
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import type { NewsArticle } from '../../domain/types/news-article.type';
import { NewsService } from './news.service';

describe('NewsService', () => {
  const document = createEmptyEditorDocument('NEWS');
  let repository: jest.Mocked<NewsRepository>;
  let editor: Pick<EditorService, 'normalize'>;
  let service: NewsService;
  let createDraft: jest.Mock;
  let normalize: jest.Mock;

  beforeEach(() => {
    createDraft = jest.fn();
    normalize = jest.fn().mockReturnValue({
      document,
      canonicalJson: JSON.stringify(document),
      plainText: 'Full news text',
      searchText: 'full news text',
    });
    repository = {
      createDraft,
      findById: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(null),
    };
    editor = {
      normalize,
    };
    service = new NewsService(repository, editor as EditorService);
  });

  it('normalizes a NEWS document and creates the canonical draft', async () => {
    const created = { id: 'article-1' } as NewsArticle;
    repository.createDraft.mockResolvedValue(created);

    await expect(
      service.createDraft({
        authorId: 'author-1',
        postType: 'STANDARD',
        visibility: 'PUBLIC',
        language: 'uk',
        slug: 'station-update',
        title: ' Station update ',
        shortText: ' A concise station update. ',
        documentJson: JSON.stringify(document),
        coverMediaId: null,
      }),
    ).resolves.toBe(created);

    expect(normalize).toHaveBeenCalledWith(JSON.stringify(document), 'NEWS');
    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Station update',
        shortText: 'A concise station update.',
        document,
        plainText: 'Full news text',
      }),
    );
  });

  it('rejects invalid metadata before persistence', async () => {
    await expect(
      service.createDraft({
        authorId: 'author-1',
        postType: 'TEXT',
        visibility: 'PUBLIC',
        language: 'uk',
        slug: 'Invalid Slug',
        title: 'Valid title',
        shortText: 'A valid short description.',
        documentJson: JSON.stringify(document),
        coverMediaId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('rejects a slug already owned in the same language', async () => {
    repository.findBySlug.mockResolvedValue({ id: 'existing' } as NewsArticle);
    await expect(
      service.createDraft({
        authorId: 'author-1',
        postType: 'STANDARD',
        visibility: 'PUBLIC',
        language: 'uk',
        slug: 'station-update',
        title: 'Station update',
        shortText: 'A concise station update.',
        documentJson: JSON.stringify(document),
        coverMediaId: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
