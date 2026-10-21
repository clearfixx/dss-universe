/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: apps/api/src/core/storage/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public API of the Storage core module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { StorageModule } from './storage.module';
export { StorageService } from './services/storage.service';
export type {
  SavedFile,
  SaveFileInput,
  StorageProvider,
} from './interfaces/storage-provider.interface';

/**
 * -----------------------------------------------------------------------------
 * 🚪 Public exports stay intentional.
 * -----------------------------------------------------------------------------
 */
