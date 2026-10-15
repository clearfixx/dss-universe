/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-public-profile.reader.ts
 *
 * 🎯 Purpose:
 * Reads allowlisted public display fields in a root-supplied persistence snapshot.
 *
 * 🧠 Responsibilities:
 * • batches distinct subject IDs without per-author queries;
 * • keeps private profile, credentials and access state outside display projections.
 *
 * 🏗️ Architecture:
 * Stateless infrastructure-only adapter; not a feature-facing Users facade.
 *
 * ⚠️ Important:
 * Display existence is not active-account eligibility or an authorization grant.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type PublicDisplayProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarMediaId: string | null;
};

@Injectable()
export class PrismaPublicProfileReader {
  async read(
    transaction: Prisma.TransactionClient,
    subjectIds: readonly string[],
  ): Promise<Map<string, PublicDisplayProfile>> {
    if (!subjectIds.length) return new Map();
    const rows = await transaction.user.findMany({
      where: { id: { in: [...new Set(subjectIds)] } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarMediaId: true,
      },
    });
    return new Map(rows.map((row) => [row.id, row]));
  }
}
