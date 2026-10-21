/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-transactional-subject-existence.reader.ts
 *
 * 🎯 Purpose:
 * Supplies authoritative ID-only subject existence inside a supplied root transaction.
 *
 * 🧠 Responsibilities:
 * • accepts every existing account state without eligibility inference;
 * • reads no credentials, status, permissions or profile facts.
 *
 * 🏗️ Architecture:
 * Stateless Auth technical reader; no IAM dependency or independent transaction.
 *
 * ⚠️ Important:
 * Do not substitute the separate ACTIVE selector or cache across operations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
@Injectable()
export class PrismaTransactionalSubjectExistenceReader {
  async exists(
    transaction: TransactionClient,
    subjectId: string,
  ): Promise<boolean> {
    return Boolean(
      await transaction.user.findUnique({
        where: { id: subjectId },
        select: { id: true },
      }),
    );
  }
}
