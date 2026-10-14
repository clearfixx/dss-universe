/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation-total.reader.ts
 *
 * 🎯 Purpose:
 * Reads the signed reputation total including compensating entries.
 *
 * 🧠 Responsibilities:
 * • sums every owned entry for the recipient;
 * • maps only an empty aggregate to zero and propagates errors.
 *
 * 🏗️ Architecture:
 * Private Reputation infrastructure; no history/profile aggregate crosses the contract.
 *
 * ⚠️ Important:
 * Reversals are compensating entries; do not filter them or count only original votes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { ReputationTotalReader } from '../../contracts/reputation-total-reader.contract';
@Injectable()
export class PrismaReputationTotalReader implements ReputationTotalReader {
  constructor(private readonly prisma: PrismaService) {}
  async totalFor(recipientId: string): Promise<number> {
    const result = await this.prisma.reputationEntry.aggregate({
      where: { recipientId },
      _sum: { value: true },
    });
    return result._sum.value ?? 0;
  }
}
