import type { StorageService } from '@api/core/storage';

import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import type { MediaUrlSignerService } from './media-url-signer.service';
import { MediaDeliveryService } from './media-delivery.service';

describe('MediaDeliveryService', () => {
  it('delivers a public original with its download filename', async () => {
    const media = {
      findPublicOriginal: jest.fn().mockResolvedValue({
        id: 'media-1',
        mediaId: 'media-1',
        name: 'original',
        storageProvider: MediaStorageProvider.LOCAL,
        bucket: 'media',
        storageKey: 'media/media-1/original.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 42,
        checksum: 'a'.repeat(64),
        width: null,
        height: null,
        metadata: null,
        createdAt: new Date(),
        originalFilename: 'guide.pdf',
      }),
      findPublicVariant: jest.fn(),
    } as unknown as jest.Mocked<MediaRepository>;
    const storage = {
      read: jest.fn().mockResolvedValue(Buffer.from('file')),
    } as unknown as jest.Mocked<StorageService>;
    const service = new MediaDeliveryService(
      media,
      storage,
      {} as MediaUrlSignerService,
    );

    await expect(service.publicVariant('media-1', 'original')).resolves.toEqual(
      expect.objectContaining({
        mimeType: 'application/pdf',
        originalFilename: 'guide.pdf',
      }),
    );
    expect(media.findPublicOriginal.mock.calls[0]).toEqual(['media-1']);
    expect(media.findPublicVariant.mock.calls).toHaveLength(0);
  });
});
