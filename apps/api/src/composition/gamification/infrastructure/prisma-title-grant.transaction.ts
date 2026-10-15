/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/infrastructure/prisma-title-grant.transaction.ts
 *
 * 🎯 Purpose:
 * Binds title grants and Users-owned existence to one unchanged default transaction.
 *
 * 🧠 Responsibilities:
 * • owns transaction lifetime without new isolation, timeout or retry settings;
 * • supplies only a transaction-local Boolean recipient check to the owned writer.
 *
 * 🏗️ Architecture:
 * Root unit of work behind a Custom Titles-owned semantic command port.
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
  GrantCustomTitle,
  TitleGrantTransaction,
} from '@api/modules/custom-titles';
import { PrismaTitleGrantWriter } from '@api/modules/custom-titles/infrastructure';
import { PrismaTransactionalProfileExistenceReader } from '@api/modules/users/infrastructure';

@Injectable()
export class PrismaTitleGrantTransaction implements TitleGrantTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: PrismaTitleGrantWriter,
    private readonly profiles: PrismaTransactionalProfileExistenceReader,
  ) {}
  grant(input: GrantCustomTitle) {
    return this.prisma.$transaction((transaction) =>
      this.writer.grant(transaction, input, () =>
        this.profiles.exists(transaction, input.userId),
      ),
    );
  }
}
