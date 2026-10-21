/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-reputation-actor.reader.ts
 *
 * 🎯 Purpose:
 * Supplies only current public actor presentation for root-composed ledger responses.
 *
 * 🧠 Responsibilities:
 * • batches distinct actor IDs with a fixed four-field display projection;
 * • preserves historical display availability regardless of account eligibility.
 *
 * 🏗️ Architecture:
 * Stateless guarded technical adapter; not a Users business facade or access decision.
 *
 * ⚠️ Important:
 * Credentials, access state, email and media ownership fields are never selected.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaReputationActorReader {
  async read(
    transaction: Prisma.TransactionClient,
    actorIds: readonly string[],
  ) {
    if (!actorIds.length)
      return new Map<
        string,
        {
          id: string;
          username: string;
          displayName: string | null;
          avatarUrl: string | null;
        }
      >();
    const rows = await transaction.user.findMany({
      where: { id: { in: [...new Set(actorIds)] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    return new Map(rows.map((row) => [row.id, row]));
  }
}
