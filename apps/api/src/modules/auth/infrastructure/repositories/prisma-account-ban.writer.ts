/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-account-ban.writer.ts
 *
 * 🎯 Purpose:
 * Auth-owned account writes of a permanent ban for guarded root composition.
 *
 * ⚠️ Important:
 * Runs inside the caller's transaction: status and session revocation commit with the ban record.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaAccountBanWriter {
  /**
   * Marks the account banned, invalidates every token and revokes sessions.
   * Returns the previous status, or null when it cannot be banned.
   */
  async ban(
    tx: Prisma.TransactionClient,
    subjectId: string,
  ): Promise<'ACTIVE' | 'DEACTIVATED' | null> {
    const account = await tx.user.findUnique({
      where: { id: subjectId },
      select: { status: true },
    });
    const previous = account?.status;
    if (previous !== 'ACTIVE' && previous !== 'DEACTIVATED') return null;
    const changed = await tx.user.updateMany({
      where: { id: subjectId, status: previous },
      data: {
        status: 'BANNED',
        authVersion: { increment: 1 },
        refreshTokenHash: null,
      },
    });
    if (changed.count !== 1) return null;
    await tx.session.updateMany({
      where: { userId: subjectId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return previous;
  }

  /** Returns a banned account to its earlier status. */
  async restore(
    tx: Prisma.TransactionClient,
    subjectId: string,
    status: 'ACTIVE' | 'DEACTIVATED',
  ): Promise<boolean> {
    const changed = await tx.user.updateMany({
      where: { id: subjectId, status: 'BANNED' },
      data: { status, authVersion: { increment: 1 } },
    });
    return changed.count === 1;
  }
}
