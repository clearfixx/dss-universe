import { BadRequestException, ConflictException } from '@nestjs/common';
import { createEmptyEditorDocument } from '@dss/editor';

import type { EditorService } from '../../../editor';
import type { MediaRepository } from '../../../media/domain/repositories/media.repository.interface';
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import type { NewsArticle } from '../../domain/types/news-article.type';
import { NewsPostTemplateService } from './news-post-template.service';
import { NewsService } from './news.service';

describe('NewsService', () => {
  const document = createEmptyEditorDocument('NEWS');
  let repository: jest.Mocked<NewsRepository>;
  let editor: Pick<EditorService, 'normalize'>;
  let service: NewsService;
  let createDraft: jest.Mock;
  let saveDraft: jest.Mock;
  let normalize: jest.Mock;
  let findMediaById: jest.Mock;

  beforeEach(() => {
    createDraft = jest.fn();
    saveDraft = jest.fn();
    normalize = jest.fn().mockReturnValue({
      document,
      canonicalJson: JSON.stringify(document),
      plainText: 'Full news text',
      searchText: 'full news text',
    });
    findMediaById = jest.fn();
    repository = {
      createDraft,
      findById: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(null),
      saveDraft,
    };
    editor = {
      normalize,
    };
    service = new NewsService(
      repository,
      editor as EditorService,
      new NewsPostTemplateService(),
      { findById: findMediaById } as unknown as MediaRepository,
    );
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
        templateData: {},
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

  it('extracts unique owned attachment identities from the canonical document', async () => {
    const attachmentId = '123e4567-e89b-42d3-a456-426614174000';
    const documentWithAttachment = {
      ...document,
      content: {
        ...document.content,
        content: [
          ...(document.content.content ?? []),
          {
            type: 'attachment' as const,
            attrs: { mediaId: attachmentId, label: 'Guide' },
          },
        ],
      },
    };
    normalize.mockReturnValueOnce({
      document: documentWithAttachment,
      plainText: 'Full news text',
      searchText: 'full news text',
    });
    findMediaById.mockResolvedValue({ ownerId: 'author-1', isPublic: false });
    createDraft.mockResolvedValue({ id: 'article-1' });

    await service.createDraft({
      authorId: 'author-1',
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'attachment-guide',
      title: 'Attachment guide',
      shortText: 'A concise attachment guide.',
      documentJson: JSON.stringify(documentWithAttachment),
      coverMediaId: null,
    });

    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentMediaIds: [attachmentId] }),
    );
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

  it('advances an owned draft from the supplied optimistic version', async () => {
    const current = {
      id: 'article-1',
      authorId: 'author-1',
      status: 'DRAFT',
      currentVersion: 1,
    } as NewsArticle;
    repository.findById.mockResolvedValue(current);
    repository.findBySlug.mockResolvedValue(current);
    saveDraft.mockResolvedValue({
      ...current,
      currentVersion: 2,
    });

    await expect(
      service.saveDraft('author-1', {
        articleId: 'article-1',
        baseVersion: 1,
        changeSummary: 'Expanded intro',
        postType: 'STANDARD',
        visibility: 'PUBLIC',
        language: 'uk',
        slug: 'station-update',
        title: 'Station update',
        shortText: 'A concise station update.',
        documentJson: JSON.stringify(document),
        coverMediaId: null,
      }),
    ).resolves.toMatchObject({ currentVersion: 2 });
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 'article-1',
        authorId: 'author-1',
        baseVersion: 1,
        document,
        templateData: {},
      }),
    );
  });

  it('surfaces an optimistic conflict instead of overwriting a newer draft', async () => {
    const current = {
      id: 'article-1',
      authorId: 'author-1',
      status: 'DRAFT',
      currentVersion: 2,
    } as NewsArticle;
    repository.findById.mockResolvedValue(current);
    repository.findBySlug.mockResolvedValue(current);
    saveDraft.mockResolvedValue(null);

    await expect(
      service.saveDraft('author-1', {
        articleId: 'article-1',
        baseVersion: 1,
        changeSummary: null,
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
