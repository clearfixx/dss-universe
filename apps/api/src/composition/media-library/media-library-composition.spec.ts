/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Library Composition Tests
 * 📄 File: apps/api/src/composition/media-library/media-library-composition.spec.ts
 *
 * 🎯 Purpose:
 * Verifies narrow provider wiring and exact repository delegation without IO.
 *
 * 🧠 Responsibilities:
 * • checks the exported token and its implementation;
 * • preserves caller arguments, results and failures across delegation;
 * • checks the Users predicate contains only two relation absences.
 *
 * 🏗️ Architecture:
 * Composition unit tests; PostgreSQL behavior is covered by a separate suite.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import {
  MEDIA_LIBRARY_PERSISTENCE,
  type MediaLibraryPersistence,
} from '@api/modules/media';
import { unusedProfileAssetWhere } from '@api/modules/users/infrastructure';
import { PrismaMediaRepository } from '@api/modules/media/infrastructure/repositories/prisma-media.repository';
import { MediaLibraryCompositionModule } from './media-library-composition.module';
import { PrismaProfileAwareMediaLibrary } from './infrastructure/prisma-profile-aware-media-library';

describe('Media library composition boundaries', () => {
  it('exports only the semantic token and binds the root adapter', () => {
    expect(
      Reflect.getMetadata('exports', MediaLibraryCompositionModule),
    ).toEqual([MEDIA_LIBRARY_PERSISTENCE]);
    expect(
      Reflect.getMetadata('providers', MediaLibraryCompositionModule),
    ).toEqual([
      {
        provide: MEDIA_LIBRARY_PERSISTENCE,
        useClass: PrismaProfileAwareMediaLibrary,
      },
    ]);
  });

  it('returns a fresh profile-absence predicate without credentials or policy', () => {
    const where = unusedProfileAssetWhere();
    expect(where).toEqual({ avatarFor: null, coverFor: null });
    delete where.avatarFor;
    expect(unusedProfileAssetWhere()).toEqual({
      avatarFor: null,
      coverFor: null,
    });
  });

  it('delegates only the three fixed operations with unchanged arguments and results', async () => {
    const page = { items: [], hasNextPage: false };
    const metrics = {
      totalMedia: 0,
      originalBytes: 0,
      variantBytes: 0,
      totalBytes: 0,
      orphanedMedia: 0,
      failedMedia: 0,
      quarantinedMedia: 0,
    };
    const claims: never[] = [];
    const library = {
      browseLibrary: jest.fn().mockResolvedValue(page),
      getLibraryMetrics: jest.fn().mockResolvedValue(metrics),
      claimCleanupCandidates: jest.fn().mockResolvedValue(claims),
    } satisfies MediaLibraryPersistence;
    const repository = new PrismaMediaRepository(
      {} as PrismaService,
      {} as AuditWriterService,
      library,
    );
    const query = { first: 3, orphaned: true };
    const cutoff = new Date('2026-01-01T00:00:00Z');
    expect(await repository.browseLibrary(query)).toBe(page);
    expect(library.browseLibrary).toHaveBeenCalledWith(query);
    expect(await repository.getLibraryMetrics()).toBe(metrics);
    expect(library.getLibraryMetrics).toHaveBeenCalledWith();
    expect(await repository.claimCleanupCandidates(cutoff, 7)).toBe(claims);
    expect(library.claimCleanupCandidates).toHaveBeenCalledWith(cutoff, 7);
    const failure = new Error('synthetic persistence failure');
    library.claimCleanupCandidates.mockRejectedValueOnce(failure);
    await expect(repository.claimCleanupCandidates(cutoff, 7)).rejects.toBe(
      failure,
    );
  });
});
