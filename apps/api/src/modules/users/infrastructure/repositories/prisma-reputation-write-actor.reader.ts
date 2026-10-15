/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-reputation-write-actor.reader.ts
 *
 * 🎯 Purpose:
 * Preserves public actor lookup stages inside atomic ledger write responses.
 *
 * 🧠 Responsibilities:
 * • selects exactly id/username/displayName/avatarUrl with no eligibility rule;
 * • executes the legacy empty compensation-actor read before evidence append.
 *
 * 🏗️ Architecture:
 * Stateless guarded operation-specific reader; unlike history reads, empty IDs still issue SQL.
 *
 * ⚠️ Important:
 * An empty IN predicate returns no rows, not an invented actor or a permission grant.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaReputationWriteActorReader {
  async read(
    transaction: Prisma.TransactionClient,
    actorIds: readonly string[],
  ) {
    const rows = await transaction.user.findMany({
      where: { id: { in: [...new Set(actorIds)] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    return new Map(rows.map((row) => [row.id, row]));
  }
}
