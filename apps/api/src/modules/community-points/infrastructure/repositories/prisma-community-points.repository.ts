/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/infrastructure/repositories/prisma-community-points.repository.ts
 *
 * 🎯 Purpose:
 * Persists Community Points as an immutable, idempotent event ledger.
 *
 * 🧠 Responsibilities:
 * • serializes event consumption and source reversals;
 * • enforces configurable UTC-day anti-abuse limits;
 * • appends processed-event, audit and Outbox evidence transactionally;
 * • calculates balances from immutable ledger values.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type { CommunityPointsRepository } from '../../domain/repositories/community-points.repository.interface';
import type {
  CommunityPointAwardInput,
  CommunityPointConsumption,
  CommunityPointEntry,
  CommunityPointHistory,
  CommunityPointRule,
  CommunityPointReversal,
  CommunityPointSourceReversal,
} from '../../domain/types/community-points.type';

const CONSUMER_NAME = 'dss.api.community-points';
const AWARDED_EVENT = 'community-points.awarded.v1';
const REVERSED_EVENT = 'community-points.reversed.v1';

type EntryRow = {
  id: string;
  userId: string;
  ruleKey: string;
  points: number;
  reason: string;
  sourceEventId: string | null;
  sourceEventName: string | null;
  sourceType: string | null;
  sourceId: string | null;
  actorId: string | null;
  occurredAt: Date;
  reversal?: {
    id: string;
    actorId: string | null;
    reason: string;
    occurredAt: Date;
  } | null;
};

const entryInclude = {
  reversal: {
    select: {
      id: true,
      actorId: true,
      reason: true,
      occurredAt: true,
    },
  },
} as const;

@Injectable()
export class PrismaCommunityPointsRepository implements CommunityPointsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async balance(userId: string): Promise<number> {
    const balance = await this.prisma.communityPointEntry.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return balance._sum.points ?? 0;
  }

  async rules(): Promise<CommunityPointRule[]> {
    return this.prisma.communityPointRule.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async matchingRules(
    eventName: string,
    payloadValue?: number,
  ): Promise<CommunityPointRule[]> {
    return this.prisma.communityPointRule.findMany({
      where: {
        eventName,
        enabled: true,
        OR:
          payloadValue === undefined
            ? [{ payloadValue: null }]
            : [{ payloadValue: null }, { payloadValue }],
      },
      orderBy: [{ payloadValue: 'desc' }, { key: 'asc' }],
    });
  }

  async updateRule(
    key: string,
    points: number,
    dailyLimit: number | null,
    enabled: boolean,
    updatedById: string,
  ): Promise<CommunityPointRule | null> {
    return this.prisma.$transaction(async (transaction) => {
      const exists = await transaction.communityPointRule.findUnique({
        where: { key },
        select: { key: true },
      });
      if (!exists) return null;
      const rule = await transaction.communityPointRule.update({
        where: { key },
        data: { points, dailyLimit, enabled, updatedById },
      });
      await this.audit.append(transaction, {
        action: 'community-points.rule.updated',
        actorType: 'USER',
        actorId: updatedById,
        targetType: 'CommunityPointRule',
        targetId: key,
        metadata: { points, dailyLimit, enabled },
      });
      return rule;
    });
  }

  async award(
    input: CommunityPointAwardInput,
  ): Promise<CommunityPointConsumption> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `community-points:${input.event.eventId}`);
      const processed = await transaction.processedEvent.findUnique({
        where: {
          eventId_consumerName: {
            eventId: input.event.eventId,
            consumerName: CONSUMER_NAME,
          },
        },
        select: { id: true },
      });
      if (processed) return { status: 'DUPLICATE', entry: null };

      if (
        input.event.aggregateType &&
        input.event.aggregateId &&
        (await transaction.communityPointRevokedSource.findUnique({
          where: {
            sourceType_sourceId: {
              sourceType: input.event.aggregateType,
              sourceId: input.event.aggregateId,
            },
          },
          select: { id: true },
        }))
      ) {
        await this.markProcessed(transaction, input);
        return { status: 'IGNORED', entry: null };
      }

      if (
        input.rule.dailyLimit !== null &&
        (await this.dailyAwardCount(
          transaction,
          input.userId,
          input.rule.key,
          input.event.occurredAt,
        )) >= input.rule.dailyLimit
      ) {
        await this.markProcessed(transaction, input);
        return { status: 'CAPPED', entry: null };
      }

      const entry = await transaction.communityPointEntry.create({
        data: {
          userId: input.userId,
          ruleKey: input.rule.key,
          points: input.rule.points,
          reason: input.reason,
          sourceEventId: input.event.eventId,
          sourceEventName: input.event.eventName,
          sourceType: input.event.aggregateType,
          sourceId: input.event.aggregateId,
          actorId: input.event.actorId,
          occurredAt: input.event.occurredAt,
        },
        include: entryInclude,
      });
      await this.markProcessed(transaction, input);
      await this.appendEvidence(transaction, entry, AWARDED_EVENT);
      return { status: 'AWARDED', entry: this.toDomain(entry) };
    });
  }

  async findOriginalById(id: string): Promise<CommunityPointEntry | null> {
    const entry = await this.prisma.communityPointEntry.findFirst({
      where: { id, reversesEntryId: null },
      include: entryInclude,
    });
    return entry ? this.toDomain(entry) : null;
  }

  async reverse(
    entryId: string,
    actorId: string,
    reason: string,
    occurredAt: Date,
  ): Promise<CommunityPointEntry | null> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `community-points-reversal:${entryId}`);
      const original = await transaction.communityPointEntry.findFirst({
        where: { id: entryId, reversesEntryId: null },
        select: { id: true, userId: true, ruleKey: true, points: true },
      });
      if (!original) return null;
      const exists = await transaction.communityPointEntry.findUnique({
        where: { reversesEntryId: entryId },
        select: { id: true },
      });
      if (exists) return null;
      return this.appendReversal(
        transaction,
        original,
        actorId,
        reason,
        occurredAt,
      );
    });
  }

  async reverseSource(
    sourceType: string,
    sourceId: string,
    sourceEventId: string,
    actorId: string | undefined,
    reason: string,
    occurredAt: Date,
  ): Promise<CommunityPointSourceReversal> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(
        transaction,
        `community-points-source-reversal:${sourceType}:${sourceId}`,
      );
      const revoked = await transaction.communityPointRevokedSource.findUnique({
        where: { sourceType_sourceId: { sourceType, sourceId } },
        select: { id: true },
      });
      if (revoked) return { entries: [], duplicate: true };
      await transaction.communityPointRevokedSource.create({
        data: {
          sourceType,
          sourceId,
          sourceEventId,
          actorId,
          reason,
          occurredAt,
        },
      });
      const originals = await transaction.communityPointEntry.findMany({
        where: {
          sourceType,
          sourceId,
          reversesEntryId: null,
          reversal: null,
        },
        select: { id: true, userId: true, ruleKey: true, points: true },
      });
      const reversals: CommunityPointEntry[] = [];
      for (const original of originals) {
        reversals.push(
          await this.appendReversal(
            transaction,
            original,
            actorId,
            reason,
            occurredAt,
          ),
        );
      }
      return { entries: reversals, duplicate: false };
    });
  }

  async history(
    userId: string,
    page: number,
    limit: number,
  ): Promise<CommunityPointHistory> {
    const where = { userId, reversesEntryId: null };
    const [items, total, balance] = await this.prisma.$transaction([
      this.prisma.communityPointEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityPointEntry.count({ where }),
      this.prisma.communityPointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
    ]);
    return {
      items: items.map((entry) => this.toDomain(entry)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      balance: balance._sum.points ?? 0,
    };
  }

  private async appendReversal(
    transaction: TransactionClient,
    original: { id: string; userId: string; ruleKey: string; points: number },
    actorId: string | undefined,
    reason: string,
    occurredAt: Date,
  ): Promise<CommunityPointEntry> {
    const reversal = await transaction.communityPointEntry.create({
      data: {
        userId: original.userId,
        ruleKey: original.ruleKey,
        points: -original.points,
        reason,
        actorId,
        reversesEntryId: original.id,
        occurredAt,
      },
      include: entryInclude,
    });
    await this.appendEvidence(transaction, reversal, REVERSED_EVENT);
    return this.toDomain(reversal);
  }

  private async dailyAwardCount(
    transaction: TransactionClient,
    userId: string,
    ruleKey: string,
    occurredAt: Date,
  ): Promise<number> {
    const start = new Date(
      Date.UTC(
        occurredAt.getUTCFullYear(),
        occurredAt.getUTCMonth(),
        occurredAt.getUTCDate(),
      ),
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return transaction.communityPointEntry.count({
      where: {
        userId,
        ruleKey,
        reversesEntryId: null,
        occurredAt: { gte: start, lt: end },
      },
    });
  }

  private markProcessed(
    transaction: TransactionClient,
    input: CommunityPointAwardInput,
  ): Promise<unknown> {
    return transaction.processedEvent.create({
      data: {
        eventId: input.event.eventId,
        consumerName: CONSUMER_NAME,
        eventName: input.event.eventName,
        eventVersion: input.event.eventVersion,
      },
    });
  }

  private async appendEvidence(
    transaction: TransactionClient,
    entry: EntryRow,
    eventName: string,
  ): Promise<void> {
    const metadata = {
      userId: entry.userId,
      ruleKey: entry.ruleKey,
      points: entry.points,
      ...(entry.sourceType ? { sourceType: entry.sourceType } : {}),
      ...(entry.sourceId ? { sourceId: entry.sourceId } : {}),
    };
    await this.audit.append(transaction, {
      action:
        eventName === AWARDED_EVENT
          ? 'community-points.awarded'
          : 'community-points.reversed',
      actorType: entry.actorId ? 'USER' : 'SYSTEM',
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      targetType: 'CommunityPointEntry',
      targetId: entry.id,
      reason: entry.reason,
      metadata,
      occurredAt: entry.occurredAt.toISOString(),
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: eventName,
        version: 1,
        category: 'integration',
        producer: CONSUMER_NAME,
        ...(entry.actorId ? { actorId: entry.actorId } : {}),
        aggregate: { type: 'CommunityPointEntry', id: entry.id },
        payload: metadata,
      }),
    );
  }

  private lock(
    transaction: TransactionClient,
    coordinate: string,
  ): Promise<number> {
    return transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))
    `;
  }

  private toDomain(row: EntryRow): CommunityPointEntry {
    return {
      id: row.id,
      userId: row.userId,
      ruleKey: row.ruleKey,
      points: row.points,
      reason: row.reason,
      sourceEventId: row.sourceEventId,
      sourceEventName: row.sourceEventName,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      actorId: row.actorId,
      occurredAt: row.occurredAt,
      reversal: row.reversal ? this.reversal(row.reversal) : null,
    };
  }

  private reversal(
    row: NonNullable<EntryRow['reversal']>,
  ): CommunityPointReversal {
    return row;
  }
}

/**
 * 🔭 The leaderboard may move quickly; the ledger still shows every step.
 */
