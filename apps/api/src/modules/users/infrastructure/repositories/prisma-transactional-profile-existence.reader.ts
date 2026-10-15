/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-transactional-profile-existence.reader.ts
 *
 * 🎯 Purpose:
 * Supplies ID-only profile existence within an explicitly supplied root transaction.
 *
 * 🧠 Responsibilities:
 * • reads no profile/account fields besides ID;
 * • accepts every existing state without caching or eligibility inference.
 *
 * 🏗️ Architecture:
 * Stateless owned technical reader; no independent PrismaService or transaction lifetime.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';

@Injectable()
export class PrismaTransactionalProfileExistenceReader {
  async exists(
    transaction: TransactionClient,
    userId: string,
  ): Promise<boolean> {
    return Boolean(
      await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    );
  }
}
