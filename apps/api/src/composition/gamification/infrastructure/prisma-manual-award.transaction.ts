/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/infrastructure/prisma-manual-award.transaction.ts
 *
 * 🎯 Purpose:
 * Binds manual awards and Users-owned existence to one unchanged default transaction.
 *
 * 🧠 Responsibilities:
 * • owns transaction lifetime without new isolation, timeout or retry settings;
 * • supplies only a transaction-local Boolean recipient check to the owned writer.
 *
 * 🏗️ Architecture:
 * Root unit of work behind an Achievements-owned semantic command port.
 *
 * ⚠️ Important:
 * No owner-table SQL, pre-read, async event replacement or post-commit lookup.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  ManualAchievementAward,
  ManualAwardTransaction,
} from '@api/modules/achievements';
import { PrismaManualAwardWriter } from '@api/modules/achievements/infrastructure';
import { PrismaTransactionalProfileExistenceReader } from '@api/modules/users/infrastructure';

@Injectable()
export class PrismaManualAwardTransaction implements ManualAwardTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: PrismaManualAwardWriter,
    private readonly profiles: PrismaTransactionalProfileExistenceReader,
  ) {}
  award(input: ManualAchievementAward) {
    return this.prisma.$transaction((transaction) =>
      this.writer.award(transaction, input, () =>
        this.profiles.exists(transaction, input.userId),
      ),
    );
  }
}
