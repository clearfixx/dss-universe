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

import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_PROVIDER } from '../constants/storage.constants';
import type {
  SavedFile,
  SaveFileInput,
  StorageProvider,
} from '../interfaces/storage-provider.interface';

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

  delete(path: string): Promise<void> {
    return this.storageProvider.delete(path);
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🧠 StorageService is the airlock between features and file infrastructure.
 * -----------------------------------------------------------------------------
 */
