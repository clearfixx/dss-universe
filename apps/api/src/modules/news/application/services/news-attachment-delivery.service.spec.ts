/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/application/services/news-attachment-delivery.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins attachment traversal, hidden-container exclusion, order/deduplication and display-kind transfer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { NewsAttachmentDeliveryService } from './news-attachment-delivery.service';
import type {
  NewsAttachmentFile,
  NewsAttachmentReader,
} from '../../domain/ports/news-attachment-reader.interface';

describe('NewsAttachmentDeliveryService', () => {
  const read = jest.fn<
    ReturnType<NewsAttachmentReader['read']>,
    Parameters<NewsAttachmentReader['read']>
  >();
  const service = new NewsAttachmentDeliveryService({ read });
  const file: NewsAttachmentFile = {
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
  };
  const attachment = (mediaId: string, label: string) => ({
    type: 'attachment',
    attrs: { mediaId, label },
  });
  const document = (content: unknown) =>
    JSON.stringify({ profile: 'NEWS', content });
  beforeEach(() => {
    jest.resetAllMocks();
    read.mockResolvedValue([file]);
  });

  it('selects only eligible file fields, preserves labels and adds the existing display kind', async () => {
    read.mockResolvedValue([
      { ...file, storageKey: 'secret', bucket: 'secret' } as NewsAttachmentFile,
    ]);
    expect(
      await service.project('article', document([attachment('file', 'Guide')])),
    ).toEqual([{ ...file, label: 'Guide', kind: 'PDF document' }]);
    expect(read.mock.calls).toEqual([['article', ['file']]]);
  });
  it('keeps first position and last label for duplicate document attachments, independent of provider order', async () => {
    const second = { ...file, id: 'second-ref', mediaId: 'second' };
    read.mockResolvedValue([second, file]);
    const result = await service.project(
      'article',
      document([
        attachment('file', 'Old'),
        attachment('second', 'Second'),
        attachment('file', 'New'),
      ]),
    );
    expect(result.map((item) => [item.mediaId, item.label])).toEqual([
      ['file', 'New'],
      ['second', 'Second'],
    ]);
    expect(read.mock.calls).toEqual([['article', ['file', 'second']]]);
  });
  it('retains last provider reference resolution for duplicate media IDs', async () => {
    read.mockResolvedValue([
      { ...file, id: 'old' },
      { ...file, id: 'new' },
    ]);
    expect(
      (
        await service.project('article', document([attachment('file', 'File')]))
      )[0]?.id,
    ).toBe('new');
  });
  it('omits missing file evidence and extra files not requested by the document', async () => {
    read.mockResolvedValue([{ ...file, mediaId: 'unrequested' }]);
    expect(
      await service.project(
        'article',
        document([attachment('missing', 'Missing')]),
      ),
    ).toEqual([]);
  });
  it('skips every contentGate subtree without requesting hidden media IDs', async () => {
    const result = await service.project(
      'article',
      document([
        { type: 'contentGate', content: [attachment('hidden', 'Secret')] },
        { type: 'paragraph', content: [attachment('file', 'Visible')] },
      ]),
    );
    expect(result).toEqual([
      { ...file, label: 'Visible', kind: 'PDF document' },
    ]);
    expect(read.mock.calls).toEqual([['article', ['file']]]);
  });
  it('traverses nested arrays and content, not arbitrary object properties', async () => {
    const result = await service.project(
      'article',
      document([
        [
          {
            type: 'container',
            content: [attachment('file', 'Nested')],
            ignored: [attachment('ignored', 'No')],
          },
        ],
      ]),
    );
    expect(result[0]?.label).toBe('Nested');
    expect(read.mock.calls).toEqual([['article', ['file']]]);
  });
  it.each([
    null,
    42,
    'text',
    [],
    { type: 'attachment', attrs: null },
    { type: 'attachment', attrs: 'bad' },
    { type: 'attachment', attrs: { mediaId: 1, label: 'Bad' } },
    { type: 'attachment', attrs: { mediaId: 'file', label: 1 } },
    { type: 'attachment', attrs: { mediaId: 'file' } },
    {
      type: 'contentGate',
      content: [
        { type: 'attachment', attrs: { mediaId: 'hidden', label: 'Secret' } },
      ],
    },
  ])(
    'preserves no-attachment behavior for %p without invoking Media',
    async (value) => {
      expect(await service.project('article', JSON.stringify(value))).toEqual(
        [],
      );
      expect(read.mock.calls).toHaveLength(0);
    },
  );
  it.each([
    ['application/pdf', 'pdf', 'PDF document'],
    ['image/png', 'png', 'PNG image'],
    ['audio/mpeg', 'mp3', 'MP3 audio'],
    ['video/mp4', 'mp4', 'MP4 video'],
    ['application/zip', 'zip', 'ZIP archive'],
    ['application/octet-stream', 'RaR', 'RAR archive'],
    ['application/octet-stream', '7z', '7Z archive'],
    ['application/octet-stream', 'tar', 'TAR archive'],
    ['application/gzip', 'gz', 'GZ archive'],
    ['application/octet-stream', 'txt', 'TXT file'],
  ])('preserves display kind for %s/%s', async (mimeType, extension, kind) => {
    read.mockResolvedValue([{ ...file, mimeType, extension }]);
    expect(
      (
        await service.project('article', document([attachment('file', 'File')]))
      )[0]?.kind,
    ).toBe(kind);
  });
  it('propagates Media failures without returning empty success', async () => {
    read.mockRejectedValue(new Error('Media unavailable'));
    await expect(
      service.project('article', document([attachment('file', 'File')])),
    ).rejects.toThrow('Media unavailable');
  });
  it('propagates malformed repository document errors before requesting Media', async () => {
    await expect(service.project('article', 'not-json')).rejects.toThrow();
    expect(read.mock.calls).toHaveLength(0);
  });
});
