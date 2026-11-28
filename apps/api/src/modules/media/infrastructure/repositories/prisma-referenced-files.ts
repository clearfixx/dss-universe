/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-referenced-files.ts
 *
 * 🎯 Purpose:
 * Opens a READY file through an active reference of an owner record.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { StorageService } from '@api/core/storage';
import type {
  MediaReferencedFile,
  MediaReferencedFileQuery,
  MediaReferencedFiles,
} from '../../contracts/referenced-files.contract';

@Injectable()
export class PrismaReferencedFiles implements MediaReferencedFiles {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async open(
    query: MediaReferencedFileQuery,
  ): Promise<MediaReferencedFile | null> {
    const reference = await this.prisma.mediaReference.findFirst({
      where: {
        ...query,
        removedAt: null,
        media: { status: 'READY', deletedAt: null },
      },
      select: {
        media: {
          select: {
            storageProvider: true,
            bucket: true,
            storageKey: true,
            size: true,
            mimeType: true,
            checksum: true,
            originalFilename: true,
          },
        },
      },
    });
    if (!reference) return null;
    const { media } = reference;
    return {
      content: await this.storage.readObject({
        storageProvider: media.storageProvider,
        bucket: media.bucket,
        storageKey: media.storageKey,
        size: media.size,
      }),
      mimeType: media.mimeType,
      checksum: media.checksum,
      filename: media.originalFilename,
    };
  }
}
