/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-library-query.type.ts
 *
 * 🎯 Purpose:
 * Defines repository-neutral Media Library filters and cursor pagination.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaKind } from '../enums/media-kind.enum';
import type { MediaStatus } from '../enums/media-status.enum';
import type { MediaVisibility } from '../enums/media-visibility.enum';

export type MediaLibraryCursor = {
  createdAt: Date;
  id: string;
};

export type MediaLibraryQuery = {
  first: number;
  cursor?: MediaLibraryCursor;
  search?: string;
  ownerId?: string;
  status?: MediaStatus;
  kind?: MediaKind;
  visibility?: MediaVisibility;
  orphaned?: boolean;
};
