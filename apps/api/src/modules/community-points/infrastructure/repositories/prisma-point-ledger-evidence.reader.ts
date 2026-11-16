/** Immutable Points ledger evidence for root attestation, not economic policy. */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';

const select = {
  id: true,
  userId: true,
  ruleKey: true,
  points: true,
  sourceType: true,
  sourceId: true,
  actorId: true,
  reversesEntryId: true,
} as const;

@Injectable()
export class PrismaPointLedgerEvidenceReader {
  async read(transaction: TransactionClient, entryId: string) {
    const entry = await transaction.communityPointEntry.findUnique({
      where: { id: entryId },
      select,
    });
    if (!entry) return null;
    const original = entry.reversesEntryId
      ? await transaction.communityPointEntry.findUnique({
          where: { id: entry.reversesEntryId },
          select,
        })
      : entry;
    if (
      !original ||
      original.reversesEntryId !== null ||
      original.userId !== entry.userId ||
      (entry.reversesEntryId !== null && entry.points !== -original.points)
    )
      return null;
    const reversal = await transaction.communityPointEntry.findUnique({
      where: { reversesEntryId: original.id },
      select,
    });
    return {
      entry,
      original,
      reversal,
      qualificationRevision: '1' as const,
      withdrawalRevision: '2' as const,
      contractVersion: 1 as const,
    };
  }
}
