/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/media.module.ts
 *
 * 🎯 Purpose:
 * Declares the DSS Media Platform module.
 *
 * 🧠 Responsibilities:
 * • owns media-related application, domain, infrastructure, and presentation layers;
 * • uses Core Storage for physical file persistence;
 * • provides the foundation for avatars, covers, attachments, galleries, and CMS assets.
 *
 * 🏗️ Architecture:
 * Feature module.
 * Media owns media business rules and metadata.
 * Storage owns physical file persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { StorageModule } from '@api/core/storage';

@Module({
  imports: [StorageModule],
})
export class MediaModule {}

/**
 * -----------------------------------------------------------------------------
 * 🛰️ Media knows what the file means.
 * Storage knows where the file lives.
 * -----------------------------------------------------------------------------
 */
