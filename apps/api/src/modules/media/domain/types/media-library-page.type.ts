/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-library-page.type.ts
 *
 * 🎯 Purpose:
 * Defines a cursor-paginated Media Library result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaEntity } from '../entities/media.entity';

export type MediaLibraryPage = {
  items: MediaEntity[];
  hasNextPage: boolean;
};
