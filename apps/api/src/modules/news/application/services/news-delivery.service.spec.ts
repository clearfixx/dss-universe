/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/application/services/news-delivery.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins delivery validation, paging and safe document/attachment composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';

import type { NewsDeliveryRepository } from '../../domain/repositories/news-delivery.repository.interface';
import type { ShortNewsItem } from '../../domain/types/short-news.type';
import { NewsDeliveryService } from './news-delivery.service';
import { NewsAttachmentDeliveryService } from './news-attachment-delivery.service';
import type { NewsAttachmentReader } from '../../domain/ports/news-attachment-reader.interface';
import type { NewsViewerDocumentReader } from '../../domain/ports/news-viewer-document-reader.interface';

describe('NewsDeliveryService', () => {
  let repository: jest.Mocked<NewsDeliveryRepository>;
  let browseShort: jest.Mock;
  let browseShortNumbered: jest.Mock;
  let findFullBySlug: jest.Mock;
  let ratingVotes: jest.Mock;
  let comments: jest.Mock;
  let service: NewsDeliveryService;
  let projectDocument: jest.Mock<
    ReturnType<NewsViewerDocumentReader['project']>,
    Parameters<NewsViewerDocumentReader['project']>
  >;
  let readAttachments: jest.Mock<
    ReturnType<NewsAttachmentReader['read']>,
    Parameters<NewsAttachmentReader['read']>
  >;
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
    findFullBySlug = jest.fn().mockResolvedValue(null);
    ratingVotes = jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    comments = jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    repository = {
      browseShort,
      browseShortNumbered,
      chronologicalNavigation: jest.fn(),
      findFullBySlug,
      ratingVotes,
      comments,
    };
    readAttachments = jest
      .fn<
        ReturnType<NewsAttachmentReader['read']>,
        Parameters<NewsAttachmentReader['read']>
      >()
      .mockResolvedValue([]);
    projectDocument = jest
      .fn<
        ReturnType<NewsViewerDocumentReader['project']>,
        Parameters<NewsViewerDocumentReader['project']>
      >()
      .mockImplementation((documentJson) => Promise.resolve({ documentJson }));
    service = new NewsDeliveryService(
      repository,
      new NewsAttachmentDeliveryService({ read: readAttachments }),
      { project: projectDocument },
    );
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

  it('normalizes a full News address and preserves viewer context', async () => {
    await service.fullBySlug('uk', ' News-Signal ', 'viewer-1');
    expect(findFullBySlug).toHaveBeenCalledWith(
      'uk',
      'news-signal',
      'viewer-1',
    );
  });

  it('bounds public rating statistics', async () => {
    await service.ratingVotes('article-1', 2, 25);
    expect(ratingVotes).toHaveBeenCalledWith('article-1', 2, 25);
    expect(() => service.ratingVotes('article-1', 0, 25)).toThrow(
      BadRequestException,
    );
    expect(() => service.ratingVotes('article-1', 1, 101)).toThrow(
      BadRequestException,
    );
  });

  it('bounds comment pages and preserves viewer context', async () => {
    await service.comments('article-1', 2, 25, 'viewer-1');
    expect(comments).toHaveBeenCalledWith('article-1', 2, 25, 'viewer-1');
    expect(() => service.comments('article-1', 0, 25)).toThrow(
      BadRequestException,
    );
    expect(() => service.comments('article-1', 1, 101)).toThrow(
      BadRequestException,
    );
  });

  it('does not query attachment metadata for missing articles', async () => {
    expect(await service.fullBySlug('uk', 'missing')).toBeNull();
    expect(readAttachments.mock.calls).toHaveLength(0);
    expect(projectDocument.mock.calls).toHaveLength(0);
  });

  it('replaces raw JSON and uses only the safe projection for metadata extraction', async () => {
    const raw = JSON.stringify([
      {
        type: 'attachment',
        attrs: { mediaId: 'secret-file', label: 'Secret' },
      },
    ]);
    const safe = JSON.stringify([]);
    findFullBySlug.mockResolvedValue({ ...item, documentJson: raw });
    projectDocument.mockResolvedValue({ documentJson: safe });
    expect(
      await service.fullBySlug('uk', 'news-signal', 'viewer'),
    ).toMatchObject({ documentJson: safe, attachments: [] });
    expect(projectDocument.mock.calls).toEqual([[raw, 'viewer']]);
    expect(readAttachments).not.toHaveBeenCalled();
  });

  it('propagates document errors before metadata without exposing the raw article', async () => {
    findFullBySlug.mockResolvedValue({ ...item, documentJson: 'raw' });
    projectDocument.mockRejectedValue(new Error('Projection unavailable'));
    await expect(service.fullBySlug('uk', 'news-signal')).rejects.toThrow(
      'Projection unavailable',
    );
    expect(projectDocument.mock.calls).toEqual([['raw', null]]);
    expect(readAttachments).not.toHaveBeenCalled();
  });

  it('composes metadata after the full article read and preserves document fields', async () => {
    const documentJson = JSON.stringify({
      content: [
        { type: 'attachment', attrs: { mediaId: 'file', label: 'Manual' } },
      ],
    });
    const order: string[] = [];
    findFullBySlug.mockImplementation(() => {
      order.push('article');
      return Promise.resolve({
        ...item,
        documentJson,
        related: [],
        sharing: { total: 0, channels: [] },
      });
    });
    readAttachments.mockImplementation(() => {
      order.push('metadata');
      return Promise.resolve([
        {
          id: 'reference',
          mediaId: 'file',
          filename: 'manual.txt',
          mimeType: 'text/plain',
          extension: 'txt',
          size: 12,
          checksumSha256: 'sha',
          checksumSha1: null,
          checksumMd5: null,
          downloadUrl: '/api/media/public/file/original',
        },
      ]);
    });
    const result = await service.fullBySlug('uk', 'news-signal');
    expect(order).toEqual(['article', 'metadata']);
    expect(result).toMatchObject({
      id: item.id,
      documentJson,
      related: [],
      sharing: { total: 0, channels: [] },
      attachments: [{ id: 'reference', label: 'Manual', kind: 'TXT file' }],
    });
    expect(readAttachments.mock.calls).toEqual([[item.id, ['file']]]);
  });

  it('propagates article and metadata failures without returning partial full News', async () => {
    findFullBySlug.mockRejectedValue(new Error('Article unavailable'));
    await expect(service.fullBySlug('uk', 'news-signal')).rejects.toThrow(
      'Article unavailable',
    );
    expect(readAttachments.mock.calls).toHaveLength(0);
    findFullBySlug.mockResolvedValue({
      ...item,
      documentJson: JSON.stringify([
        { type: 'attachment', attrs: { mediaId: 'file', label: 'File' } },
      ]),
    });
    readAttachments.mockRejectedValue(new Error('Media unavailable'));
    await expect(service.fullBySlug('uk', 'news-signal')).rejects.toThrow(
      'Media unavailable',
    );
  });

  it('retains synchronous address validation before any read', () => {
    expect(() => service.fullBySlug('UKRAINIAN', 'news-signal')).toThrow(
      BadRequestException,
    );
    expect(() => service.fullBySlug('uk', 'bad slug')).toThrow(
      BadRequestException,
    );
    expect(findFullBySlug.mock.calls).toHaveLength(0);
    expect(readAttachments.mock.calls).toHaveLength(0);
  });
});
