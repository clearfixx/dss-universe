/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation.repository.ts
 *
 * 🎯 Purpose:
 * Persists owned Reputation policy and delegates semantic ledger read/write operations.
 *
 * 🧠 Responsibilities:
 * • updates owned policy with immutable audit evidence;
 * • delegates atomic ledger writes without foreign actor joins or ORM business contracts;
 * • delegates original/history display reads to the owned semantic composition port.
 *
 * 🏗️ Architecture:
 * Owned policy persistence; root composition binds separate semantic entry reads and atomic writes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import {
  REPUTATION_WRITE_TRANSACTION,
  type ReputationWriteTransaction,
} from '../../contracts/reputation-write-transaction.port';
import {
  REPUTATION_ENTRY_READER,
  type ReputationEntryReader,
} from '../../contracts/reputation-entry-reader.port';

import type { ReputationRepository } from '../../domain/repositories/reputation.repository.interface';
import type {
  CreateReputationEntry,
  ReputationEntry,
  ReputationHistory,
  ReputationPolicy,
  ReputationValue,
} from '../../domain/types/reputation.type';

@Injectable()
export class PrismaReputationRepository implements ReputationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    @Inject(REPUTATION_WRITE_TRANSACTION)
    private readonly writes: ReputationWriteTransaction,
    @Inject(REPUTATION_ENTRY_READER)
    private readonly reader: ReputationEntryReader,
  ) {}

  async policy(): Promise<ReputationPolicy> {
    const policy = await this.prisma.reputationPolicy.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    return policy;
  }

  async updatePolicy(
    minimumAccountAgeDays: number,
    updatedById: string,
  ): Promise<ReputationPolicy> {
    return this.prisma.$transaction(async (transaction) => {
      const policy = await transaction.reputationPolicy.upsert({
        where: { id: 'default' },
        update: { minimumAccountAgeDays, updatedById },
        create: {
          id: 'default',
          minimumAccountAgeDays,
          updatedById,
        },
      });
      await this.audit.append(transaction, {
        action: 'reputation.policy.updated',
        actorType: 'USER',
        actorId: updatedById,
        targetType: 'ReputationPolicy',
        targetId: policy.id,
        metadata: { minimumAccountAgeDays },
      });
      return policy;
    });
  }

  createDirect(input: CreateReputationEntry): Promise<ReputationEntry | null> {
    return this.writes.createDirect(input);
  }

  findOriginalById(id: string): Promise<ReputationEntry | null> {
    return this.reader.findOriginalById(id);
  }

  reverse(
    entryId: string,
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
  ): Promise<ReputationEntry | null> {
    return this.writes.reverse(entryId, actorId, recipientId, value, reason);
  }

  history(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<ReputationHistory> {
    return this.reader.history(recipientId, page, limit);
  }
}

/**
 * Policy stays in its cabin. Ledger appends use the transaction airlock. 🛰️
 */
