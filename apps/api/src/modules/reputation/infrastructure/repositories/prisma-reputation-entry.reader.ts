/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Persistence
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation-entry.reader.ts
 *
 * 🎯 Purpose:
 * Reads owned ledger facts for explicit root composition without foreign profile joins.
 *
 * 🧠 Responsibilities:
 * • selects ordered original entries and their immutable compensation facts;
 * • counts originals and sums all signed entries using the supplied read client.
 *
 * 🏗️ Architecture:
 * Stateless infrastructure-only adapter; transaction lifetime remains at the root.
 *
 * ⚠️ Important:
 * No account status filtering, profile SQL, scoring policy or synthetic missing facts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

const entrySelect = {
  id: true,
  actorId: true,
  recipientId: true,
  value: true,
  reason: true,
  createdAt: true,
} as const;

export type ReputationEntryFact = Prisma.ReputationEntryGetPayload<{
  select: typeof entrySelect;
}>;
export type ReputationReversalFact = {
  id: string;
  actorId: string;
  reversesEntryId: string | null;
  reason: string;
  createdAt: Date;
};

@Injectable()
export class PrismaReputationEntryReader {
  page(
    transaction: Prisma.TransactionClient,
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<ReputationEntryFact[]> {
    return transaction.reputationEntry.findMany({
      where: { recipientId, reversesEntryId: null },
      select: entrySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }
  original(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<ReputationEntryFact | null> {
    return transaction.reputationEntry.findFirst({
      where: { id, reversesEntryId: null },
      select: entrySelect,
    });
  }
  reversals(
    transaction: Prisma.TransactionClient,
    entryIds: readonly string[],
  ): Promise<ReputationReversalFact[]> {
    if (!entryIds.length) return Promise.resolve([]);
    return transaction.reputationEntry.findMany({
      where: { reversesEntryId: { in: [...entryIds] } },
      select: {
        id: true,
        actorId: true,
        reversesEntryId: true,
        reason: true,
        createdAt: true,
      },
    });
  }
  total(
    transaction: Prisma.TransactionClient,
    recipientId: string,
  ): Promise<number> {
    return transaction.reputationEntry.count({
      where: { recipientId, reversesEntryId: null },
    });
  }
  async score(
    transaction: Prisma.TransactionClient,
    recipientId: string,
  ): Promise<number> {
    const result = await transaction.reputationEntry.aggregate({
      where: { recipientId },
      _sum: { value: true },
    });
    return result._sum.value ?? 0;
  }
}
