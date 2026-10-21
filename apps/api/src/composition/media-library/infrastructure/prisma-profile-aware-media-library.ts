/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Library Composition
 * 📄 File: apps/api/src/composition/media-library/infrastructure/prisma-profile-aware-media-library.ts
 *
 * 🎯 Purpose:
 * Composes Users binding absence with fixed Media-owned persistence operations.
 *
 * 🧠 Responsibilities:
 * • supplies the profile predicate without loading profile records;
 * • preserves ordinary browse and independent metrics reads;
 * • scopes cleanup claims and Audit to the existing Serializable transaction.
 * • defers the entire rolled-back batch only for known Prisma P2034 conflicts.
 *
 * 🏗️ Architecture:
 * Root infrastructure adapter implementing a repository-neutral Media port.
 *
 * ⚠️ Important:
 * No new retry, timeout, snapshot for metrics or foreign feature dependency.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type { MediaLibraryPersistence } from '@api/modules/media';
import { PrismaMediaLibraryOperations } from '@api/modules/media/infrastructure';
import { unusedProfileAssetWhere } from '@api/modules/users/infrastructure';

@Injectable()
export class PrismaProfileAwareMediaLibrary implements MediaLibraryPersistence {
  private readonly operations: PrismaMediaLibraryOperations;
  constructor(
    private readonly prisma: PrismaService,
    audit: AuditWriterService,
  ) {
    this.operations = new PrismaMediaLibraryOperations(audit);
  }
  browseLibrary(
    query: Parameters<MediaLibraryPersistence['browseLibrary']>[0],
  ) {
    return this.operations.browseLibrary(
      this.prisma,
      query,
      unusedProfileAssetWhere(),
    );
  }
  getLibraryMetrics() {
    return this.operations.getLibraryMetrics(
      this.prisma,
      unusedProfileAssetWhere(),
    );
  }
  async claimCleanupCandidates(olderThan: Date, limit: number) {
    try {
      return await this.prisma.$transaction(
        (transaction) =>
          this.operations.claimCleanupCandidates(
            transaction,
            olderThan,
            limit,
            unusedProfileAssetWhere(),
          ),
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        // No keys survive rollback. The next normal invocation gets a fresh snapshot.
        return [];
      }
      throw error;
    }
  }
}
