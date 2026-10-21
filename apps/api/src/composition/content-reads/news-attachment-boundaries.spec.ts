/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/news-attachment-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins public attachment query projections, fixed owner coordinates and fail-closed boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import type { PrismaService } from '@api/core/database';
import {
  MediaModule,
  MEDIA_PUBLIC_ATTACHMENT_READER,
  MEDIA_PROFILE_ASSET_COMMANDS,
  MEDIA_PUBLICATION_EVIDENCE,
  MEDIA_IMAGE_ELIGIBILITY,
  type MediaPublicAttachmentReader,
} from '@api/modules/media';
import { PrismaPublicAttachmentReader } from '../../modules/media/infrastructure/repositories/prisma-public-attachment.reader';
import { NewsAttachmentAdapter } from './infrastructure/news-attachment.adapter';

describe('Published News attachment boundaries', () => {
  const query = {
    targetType: 'NewsArticle',
    targetId: 'article',
    purpose: 'news.attachment',
    mediaIds: ['file'],
  };
  const metadata = {
    originalFilename: 'guide.pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    size: 123,
    checksum: 'sha256',
    checksumSha1: null,
    checksumMd5: null,
    storageKey: 'secret',
    bucket: 'secret',
    metadata: { scan: 'secret' },
  };
  it('selects exact existing public metadata and no storage or scan fields', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { id: 'reference', mediaId: 'file', media: metadata },
      ]);
    const reader = new PrismaPublicAttachmentReader({
      mediaReference: { findMany },
    } as unknown as PrismaService);
    expect(await reader.read(query)).toEqual([
      {
        referenceId: 'reference',
        mediaId: 'file',
        filename: 'guide.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 123,
        checksumSha256: 'sha256',
        checksumSha1: null,
        checksumMd5: null,
        downloadUrl: '/api/media/public/file/original',
      },
    ]);
    expect(findMany.mock.calls).toEqual([
      [
        {
          where: {
            targetType: 'NewsArticle',
            targetId: 'article',
            purpose: 'news.attachment',
            removedAt: null,
            mediaId: { in: ['file'] },
            media: { status: 'READY', visibility: 'PUBLIC', deletedAt: null },
          },
          select: {
            id: true,
            mediaId: true,
            media: {
              select: {
                originalFilename: true,
                mimeType: true,
                extension: true,
                size: true,
                checksum: true,
                checksumSha1: true,
                checksumMd5: true,
              },
            },
          },
        },
      ],
    ]);
  });
  it('does not query Media for an empty requested set', async () => {
    const findMany = jest.fn();
    expect(
      await new PrismaPublicAttachmentReader({
        mediaReference: { findMany },
      } as unknown as PrismaService).read({ ...query, mediaIds: [] }),
    ).toEqual([]);
    expect(findMany.mock.calls).toHaveLength(0);
  });
  it('preserves missing matches and nullable optional checksums without inventing defaults', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const reader = new PrismaPublicAttachmentReader({
      mediaReference: { findMany },
    } as unknown as PrismaService);
    expect(await reader.read(query)).toEqual([]);
    findMany.mockResolvedValue([
      {
        id: 'reference',
        mediaId: 'file',
        media: { ...metadata, checksumSha1: 'sha1', checksumMd5: 'md5' },
      },
    ]);
    expect((await reader.read(query))[0]).toMatchObject({
      checksumSha1: 'sha1',
      checksumMd5: 'md5',
    });
  });
  it('fixes reference coordinates at the root and strips extra provider fields', async () => {
    const supplied = [
      {
        referenceId: 'reference',
        mediaId: 'file',
        filename: 'guide.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 123,
        checksumSha256: 'sha256',
        checksumSha1: null,
        checksumMd5: null,
        downloadUrl: '/api/media/public/file/original',
        storageKey: 'secret',
      },
    ];
    const read = jest
      .fn<
        ReturnType<MediaPublicAttachmentReader['read']>,
        Parameters<MediaPublicAttachmentReader['read']>
      >()
      .mockResolvedValue(supplied);
    const ids = ['file'];
    expect(
      await new NewsAttachmentAdapter({ read }).read('article', ids),
    ).toEqual([
      {
        id: 'reference',
        mediaId: 'file',
        filename: 'guide.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 123,
        checksumSha256: 'sha256',
        checksumSha1: null,
        checksumMd5: null,
        downloadUrl: '/api/media/public/file/original',
      },
    ]);
    expect(read.mock.calls).toEqual([[query]]);
    const passed = read.mock.calls[0]?.[0];
    expect(passed?.mediaIds).not.toBe(ids);
  });
  it.each(['storage', 'provider'])(
    'propagates %s failures rather than returning empty success',
    async (owner) => {
      const failure = jest.fn().mockRejectedValue(new Error('Unavailable'));
      const result =
        owner === 'storage'
          ? new PrismaPublicAttachmentReader({
              mediaReference: { findMany: failure },
            } as unknown as PrismaService).read(query)
          : new NewsAttachmentAdapter({ read: failure }).read('article', [
              'file',
            ]);
      await expect(result).rejects.toThrow('Unavailable');
    },
  );
  it('publishes only the new Media token, not its implementation or repository', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, MediaModule)).toEqual([
      MEDIA_PUBLIC_ATTACHMENT_READER,
      MEDIA_PROFILE_ASSET_COMMANDS,
      MEDIA_PUBLICATION_EVIDENCE,
      MEDIA_IMAGE_ELIGIBILITY,
    ]);
  });
});
