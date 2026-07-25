/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: apps/api/src/core/storage/providers/local-storage.provider.ts
 *
 * 🎯 Purpose:
 * Provides a local filesystem storage adapter for development and early DSS
 * Universe media features.
 *
 * 🧠 Responsibilities:
 * • writes uploaded files to the local filesystem;
 * • creates missing upload directories;
 * • returns stable public URLs for stored files;
 * • deletes previously stored local files when requested.
 *
 * 🏗️ Architecture:
 * Infrastructure provider.
 * Can be replaced later by S3, Cloudflare R2, or another storage backend.
 *
 * ⚠️ Important:
 * Feature modules should depend on StorageService, not this provider directly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import type {
  SavedFile,
  SaveFileInput,
  StorageProvider,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadsRoot = resolve(
    process.env.DSS_UPLOADS_DIR ?? resolve(process.cwd(), 'uploads'),
  );

  async save(input: SaveFileInput): Promise<SavedFile> {
    const safeDirectory = this.normalizeRelativePath(input.directory);
    const safeFilename = this.normalizeRelativePath(input.filename);
    const relativePath = `${safeDirectory}/${safeFilename}`;
    const absolutePath = this.resolveWithinRoot(relativePath);

    await mkdir(dirname(absolutePath), {
      recursive: true,
    });

    await writeFile(absolutePath, input.buffer);

    return {
      path: relativePath,
      url: `/uploads/${relativePath}`,
    };
  }

  async delete(path: string): Promise<void> {
    const safePath = this.normalizeRelativePath(path);
    const absolutePath = this.resolveWithinRoot(safePath);

    await rm(absolutePath, {
      force: true,
    });
  }

  private normalizeRelativePath(value: string): string {
    return value.replaceAll('\\', '/').replace(/^\/+/, '');
  }

  private resolveWithinRoot(path: string): string {
    const absolutePath = resolve(this.uploadsRoot, path);
    const relativePath = relative(this.uploadsRoot, absolutePath);
    if (
      isAbsolute(relativePath) ||
      relativePath === '..' ||
      relativePath.startsWith('../')
    ) {
      throw new Error('Storage path escapes the configured uploads root.');
    }
    return absolutePath;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🗄️ Local storage is temporary docking.
 * The contract is what lets us move the station later.
 * -----------------------------------------------------------------------------
 */
