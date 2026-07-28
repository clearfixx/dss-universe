/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation.repository.ts
 *
 * 🎯 Purpose:
 * Persists direct reputation as an append-only, concurrency-safe ledger.
 *
 * 🧠 Responsibilities:
 * • serializes actor-recipient decisions with PostgreSQL advisory locks;
 * • appends direct and compensating entries transactionally;
 * • emits audit and Outbox evidence beside ledger writes;
 * • calculates explainable public history and score.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type { ReputationRepository } from '../../domain/repositories/reputation.repository.interface';
import type {
  CreateReputationEntry,
  ReputationActor,
  ReputationEntry,
  ReputationHistory,
  ReputationPolicy,
  ReputationReversal,
  ReputationValue,
} from '../../domain/types/reputation.type';

const DIRECT_EVENT = 'reputation.direct.changed.v1';
const REVERSED_EVENT = 'reputation.direct.reversed.v1';

type ActorRow = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type EntryRow = {
  id: string;
  actor: ActorRow;
  recipientId: string;
  value: number;
  reason: string;
  createdAt: Date;
  reversal?: {
    id: string;
    actor: ActorRow;
    reason: string;
    createdAt: Date;
  } | null;
};

const entryInclude = {
  actor: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  reversal: {
    select: {
      id: true,
      reason: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class PrismaReputationRepository implements ReputationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
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

  async createDirect(
    input: CreateReputationEntry,
  ): Promise<ReputationEntry | null> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(
        transaction,
        `reputation:${input.actorId}:${input.recipientId}`,
      );
      const recent = await transaction.reputationEntry.findFirst({
        where: {
          actorId: input.actorId,
          recipientId: input.recipientId,
          reversesEntryId: null,
          createdAt: { gt: input.cooldownStartedAfter },
        },
        select: { id: true },
      });
      if (recent) return null;
      const entry = await transaction.reputationEntry.create({
        data: {
          actorId: input.actorId,
          recipientId: input.recipientId,
          value: input.value,
          reason: input.reason,
        },
        include: entryInclude,
      });
      await this.appendEvidence(
        transaction,
        entry.id,
        input.actorId,
        input.recipientId,
        input.value,
        input.reason,
        DIRECT_EVENT,
      );
      return this.toDomain(entry);
    });
  }

  async findOriginalById(id: string): Promise<ReputationEntry | null> {
    const entry = await this.prisma.reputationEntry.findFirst({
      where: { id, reversesEntryId: null },
      include: entryInclude,
    });
    return entry ? this.toDomain(entry) : null;
  }

  async reverse(
    entryId: string,
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
  ): Promise<ReputationEntry | null> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `reputation-reversal:${entryId}`);
      const exists = await transaction.reputationEntry.findUnique({
        where: { reversesEntryId: entryId },
        select: { id: true },
      });
      if (exists) return null;
      const entry = await transaction.reputationEntry.create({
        data: {
          actorId,
          recipientId,
          value,
          reason,
          reversesEntryId: entryId,
        },
        include: entryInclude,
      });
      await this.appendEvidence(
        transaction,
        entry.id,
        actorId,
        recipientId,
        value,
        reason,
        REVERSED_EVENT,
        entryId,
      );
      return this.toDomain(entry);
    });
  }

  async history(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<ReputationHistory> {
    const where = { recipientId, reversesEntryId: null };
    const [items, total, score] = await this.prisma.$transaction([
      this.prisma.reputationEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.reputationEntry.count({ where }),
      this.prisma.reputationEntry.aggregate({
        where: { recipientId },
        _sum: { value: true },
      }),
    ]);
    return {
      items: items.map((entry) => this.toDomain(entry)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      score: score._sum.value ?? 0,
    };
  }

  private lock(
    transaction: TransactionClient,
    coordinate: string,
  ): Promise<number> {
    return transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))
    `;
  }

  private async appendEvidence(
    transaction: TransactionClient,
    entryId: string,
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
    eventName: string,
    reversesEntryId?: string,
  ): Promise<void> {
    const evidence = {
      recipientId,
      value,
      ...(reversesEntryId ? { reversesEntryId } : {}),
    };
    await this.audit.append(transaction, {
      action:
        eventName === DIRECT_EVENT
          ? 'reputation.direct.changed'
          : 'reputation.direct.reversed',
      actorType: 'USER',
      actorId,
      targetType: 'ReputationEntry',
      targetId: entryId,
      reason,
      metadata: evidence,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: eventName,
        version: 1,
        category: 'integration',
        producer: 'dss.api.reputation',
        actorId,
        aggregate: { type: 'ReputationEntry', id: entryId },
        payload: evidence,
      }),
    );
  }

  private toDomain(row: EntryRow): ReputationEntry {
    return {
      id: row.id,
      actor: this.actor(row.actor),
      recipientId: row.recipientId,
      value: row.value as ReputationValue,
      reason: row.reason,
      createdAt: row.createdAt,
      reversal: row.reversal ? this.reversal(row.reversal) : null,
    };
  }

  private actor(row: ActorRow): ReputationActor {
    return row;
  }

  private reversal(row: NonNullable<EntryRow['reversal']>): ReputationReversal {
    return {
      id: row.id,
      actor: this.actor(row.actor),
      reason: row.reason,
      createdAt: row.createdAt,
    };
  }
}

/**
 * 🔒 Advisory locks guard the 24-hour airlock. The database gets the final say.
 */
