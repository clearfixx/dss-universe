/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Write Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/prisma-reputation-write.transaction.ts
 *
 * 🎯 Purpose:
 * Binds owned ledger writes and Users display reads to their existing atomic transaction.
 *
 * 🧠 Responsibilities:
 * • preserves default-isolation transactions with no new timeout or retry settings;
 * • composes actor/reversal/compensation-actor reads at the existing pre-evidence point.
 *
 * 🏗️ Architecture:
 * Root unit of work behind a Reputation-owned semantic port; no foreign SQL or business ORM API.
 *
 * ⚠️ Important:
 * No pre-read or post-commit profile lookup; all composition failures abort ledger and evidence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  CreateReputationEntry,
  ReputationWriteTransaction,
} from '@api/modules/reputation';
import {
  PrismaReputationWriter,
  PrismaReputationEntryReader,
  type ReputationEntryFact,
} from '@api/modules/reputation/infrastructure';
import { PrismaReputationWriteActorReader } from '@api/modules/users/infrastructure';
import { composeReputationEntry } from './reputation-entry.mapper';

@Injectable()
export class PrismaReputationWriteTransaction implements ReputationWriteTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: PrismaReputationWriter,
    private readonly entries: PrismaReputationEntryReader,
    private readonly actors: PrismaReputationWriteActorReader,
  ) {}
  createDirect(input: CreateReputationEntry) {
    return this.prisma.$transaction((transaction) =>
      this.writer.createDirect(transaction, input, (entry) =>
        this.project(transaction, entry),
      ),
    );
  }
  reverse(
    entryId: string,
    actorId: string,
    recipientId: string,
    value: -1 | 1,
    reason: string,
  ) {
    return this.prisma.$transaction((transaction) =>
      this.writer.reverse(
        transaction,
        entryId,
        actorId,
        recipientId,
        value,
        reason,
        (entry) => this.project(transaction, entry),
      ),
    );
  }
  private async project(
    transaction: Prisma.TransactionClient,
    entry: ReputationEntryFact,
  ) {
    const profiles = await this.actors.read(transaction, [entry.actorId]);
    const reversals = await this.entries.reversals(transaction, [entry.id]);
    const reversalProfiles = await this.actors.read(
      transaction,
      reversals.map(({ actorId }) => actorId),
    );
    return composeReputationEntry(
      entry,
      profiles,
      reversals.find(({ reversesEntryId }) => reversesEntryId === entry.id),
      reversalProfiles,
    );
  }
}
