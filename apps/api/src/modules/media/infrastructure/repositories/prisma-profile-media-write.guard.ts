/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Persistence
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-profile-media-write.guard.ts
 *
 * 🎯 Purpose:
 * Serializes eligible profile assignments with competing Media lifecycle writes.
 *
 * 🧠 Responsibilities:
 * • owns the READY/PUBLIC/opaque-owner predicate;
 * • creates a conflicting row version while preserving all business fields;
 * • returns only eligibility within the caller's existing transaction.
 *
 * 🏗️ Architecture:
 * Guarded infrastructure-only operation; root owns transaction lifetime.
 *
 * ⚠️ Important:
 * The physical write is required. A plain read or row lock is not equivalent.
 * Do not refresh updatedAt/retention age or expose this through business ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';

export async function guardReadyPublicProfileMediaForAssignment(
  transaction: TransactionClient,
  mediaId: string,
  subjectId: string,
): Promise<boolean> {
  const rows = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "media" SET "status" = "status"
    WHERE "id" = ${mediaId} AND "ownerId" = ${subjectId}
      AND "status" = 'READY' AND "visibility" = 'PUBLIC'
    RETURNING "id"
  `);
  return rows.length === 1;
}

/** A reserved seat is not a changed timetable. MVCC checks the timetable. ☕ */
