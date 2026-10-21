/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/media-library-persistence.port.ts
 *
 * 🎯 Purpose:
 * Defines the three profile-aware persistence operations required by Media.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { MediaCleanupCandidate } from '../domain/types/media-cleanup-candidate.type';
import type { MediaLibraryMetrics } from '../domain/types/media-library-metrics.type';
import type { MediaLibraryPage } from '../domain/types/media-library-page.type';
import type { MediaLibraryQuery } from '../domain/types/media-library-query.type';

export const MEDIA_LIBRARY_PERSISTENCE = Symbol('MEDIA_LIBRARY_PERSISTENCE');
export interface MediaLibraryPersistence {
  browseLibrary(query: MediaLibraryQuery): Promise<MediaLibraryPage>;
  getLibraryMetrics(): Promise<MediaLibraryMetrics>;
  claimCleanupCandidates(
    olderThan: Date,
    limit: number,
  ): Promise<MediaCleanupCandidate[]>;
}
