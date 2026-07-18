/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: apps/api/src/core/storage/interfaces/storage-provider.interface.ts
 *
 * 🎯 Purpose:
 * Defines the storage provider contract used by DSS Universe media features.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type SaveFileInput = {
  buffer: Buffer;
  directory: string;
  filename: string;
};

export type SavedFile = {
  path: string;
  url: string;
};

export interface StorageProvider {
  save(input: SaveFileInput): Promise<SavedFile>;
  delete(path: string): Promise<void>;
}

/**
 * -----------------------------------------------------------------------------
 * 🛰️ Storage providers hide where files actually live.
 * -----------------------------------------------------------------------------
 */
