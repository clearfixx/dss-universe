/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Composition
 * 📄 File: apps/api/src/composition/gamification/infrastructure/prisma-level-synchronization.transaction.ts
 * 🎯 Purpose: Serializes authoritative facts and owned level writes in one transaction.
 * 🧠 Responsibilities: Acquires the owned user lock before any balance/definition reads.
 * 🏗️ Architecture: Root composition over narrow owned infrastructure operations.
 * ⚠️ Important: No foreign-table SQL, target formula, cache, timeout or isolation override.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  LevelSynchronization,
  LevelSynchronizationEvent,
  LevelTargetDerivation,
} from '@api/modules/levels';
import { PrismaLevelSynchronizationWriter } from '@api/modules/levels/infrastructure';
import { PrismaTransactionalPointsBalanceReader } from '@api/modules/community-points/infrastructure';

@Injectable()
export class PrismaLevelSynchronizationTransaction implements LevelSynchronization {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: PrismaLevelSynchronizationWriter,
    private readonly points: PrismaTransactionalPointsBalanceReader,
  ) {}

  sync(event: LevelSynchronizationEvent, derive: LevelTargetDerivation) {
    return this.prisma.$transaction(async (transaction) => {
      await this.writer.lockUser(transaction, event.userId);
      const [balance, definitions] = await Promise.all([
        this.points.balance(transaction, event.userId),
        this.writer.definitions(transaction),
      ]);
      const target = derive(balance, definitions);
      return this.writer.apply(transaction, event, target, balance);
    });
  }
}
