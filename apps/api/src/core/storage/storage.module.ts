/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: apps/api/src/core/storage/storage.module.ts
 *
 * 🎯 Purpose:
 * Declares the Storage core module and wires the active storage provider.
 *
 * 🧠 Responsibilities:
 * • registers StorageService;
 * • binds the storage provider contract to the local filesystem adapter;
 * • exports StorageService for feature modules.
 *
 * 🏗️ Architecture:
 * Core infrastructure module.
 * This module owns storage wiring, not media business rules.
 *
 * ⚠️ Important:
 * Replace the provider binding here when DSS moves from local files to S3/R2.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { STORAGE_PROVIDER } from './constants/storage.constants';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { StorageService } from './services/storage.service';

@Module({
  providers: [
    StorageService,
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}

/**
 * -----------------------------------------------------------------------------
 * 🛰️ StorageModule chooses the engine.
 * Features only care that the cargo arrives.
 * -----------------------------------------------------------------------------
 */
