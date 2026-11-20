/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: apps/api/src/core/storage/services/storage.service.ts
 *
 * 🎯 Purpose:
 * Exposes storage operations through a stable application-facing service.
 *
 * 🧠 Responsibilities:
 * • accepts file save and delete requests from feature modules;
 * • delegates physical storage operations to the active provider;
 * • keeps media features independent from storage implementation details.
 *
 * 🏗️ Architecture:
 * Core service facade.
 * Feature modules use this service instead of talking to providers directly.
 *
 * ⚠️ Important:
 * This service should stay storage-focused.
 * Avatar, cover, article, or forum-specific rules belong in feature modules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { S3ObjectStorage, s3StorageConfiguration } from '@dss/storage';
import { posix } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_PROVIDER } from '../constants/storage.constants';
import type {
  SavedFile,
  SaveFileInput,
  StorageProvider,
} from '../interfaces/storage-provider.interface';

type ObjectLocation = {
  storageProvider: 'LOCAL' | 'S3' | 'MINIO';
  bucket: string;
  storageKey: string;
};

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  save(input: SaveFileInput): Promise<SavedFile> {
    return this.storageProvider.save(input);
  }

  read(path: string): Promise<Buffer> {
    return this.storageProvider.read(path);
  }

  private async withRemote<T>(
    location: ObjectLocation,
    operation: (storage: S3ObjectStorage) => Promise<T>,
  ): Promise<T> {
    if (
      location.storageProvider !== 'S3' &&
      location.storageProvider !== 'MINIO'
    ) {
      throw new Error('Unsupported media storage provider.');
    }
    const config = s3StorageConfiguration(process.env);
    const storage = new S3ObjectStorage(config.client, location.bucket);
    try {
      return await operation(storage);
    } finally {
      storage.close();
    }
  }

  async saveObject(
    location: ObjectLocation,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    if (location.storageProvider === 'LOCAL') {
      await this.save({
        buffer,
        directory: posix.dirname(location.storageKey),
        filename: posix.basename(location.storageKey),
      });
      return;
    }
    await this.withRemote(location, (storage) =>
      storage.put(location.storageKey, buffer, mimeType),
    );
  }

  readObject(location: ObjectLocation & { size: number }): Promise<Buffer> {
    if (location.storageProvider === 'LOCAL')
      return this.read(location.storageKey);
    return this.withRemote(location, (storage) =>
      storage.read(location.storageKey, Math.max(1, location.size)),
    );
  }

  deleteObject(location: ObjectLocation): Promise<void> {
    if (location.storageProvider === 'LOCAL')
      return this.delete(location.storageKey);
    return this.withRemote(location, (storage) =>
      storage.delete(location.storageKey),
    );
  }
  delete(path: string): Promise<void> {
    return this.storageProvider.delete(path);
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🧠 StorageService is the airlock between features and file infrastructure.
 * -----------------------------------------------------------------------------
 */
