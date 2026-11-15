/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/infrastructure/repositories/prisma-transactional-points-balance.reader.ts
 * 🎯 Purpose: Reads the authoritative scalar ledger balance in a caller transaction.
 * 🧠 Responsibilities: Owns the ledger query and preserves the existing sum/null semantics.
 * 🏗️ Architecture: Infrastructure-only reader consumed by root composition.
 * ⚠️ Important: Exposes no ledger rows, scoring rules or mutation capability.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';

@Injectable()
export class PrismaTransactionalPointsBalanceReader {
  async balance(
    transaction: TransactionClient,
    userId: string,
  ): Promise<number> {
    const result = await transaction.communityPointEntry.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return result._sum.points ?? 0;
  }
}
