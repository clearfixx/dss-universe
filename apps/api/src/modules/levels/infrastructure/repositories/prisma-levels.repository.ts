/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/infrastructure/repositories/prisma-levels.repository.ts
 *
 * 🎯 Purpose:
 * Persists monotonic definitions and immutable, idempotent level transitions.
 *
 * 🧠 Responsibilities:
 * • validates neighboring thresholds transactionally;
 * • serializes per-user level projection updates;
 * • records every crossed level in both directions;
 * • emits Audit and Outbox evidence beside transitions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type { LevelsRepository } from '../../domain/repositories/levels.repository.interface';
import type {
  LevelDefinition,
  LevelEvent,
  LevelSyncResult,
  LevelTransition,
  LevelTransitionDirection,
  LevelTransitionHistory,
} from '../../domain/types/levels.type';

const CONSUMER_NAME = 'dss.api.levels';
const LEVEL_CHANGED_EVENT = 'levels.changed.v1';

type TransitionRow = {
  id: string;
  userId: string;
  fromLevel: number;
  toLevel: number;
  direction: LevelTransitionDirection;
  balance: number;
  sourceEventId: string;
  sourceEventName: string;
  occurredAt: Date;
};

@Injectable()
export class PrismaLevelsRepository implements LevelsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  definitions(): Promise<LevelDefinition[]> {
    return this.prisma.levelDefinition.findMany({
      orderBy: { level: 'asc' },
    });
  }

  async updateDefinition(
    level: number,
    threshold: number,
    updatedById: string,
  ): Promise<LevelDefinition | null> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, 'levels:definitions');
      const [previous, next, duplicate] = await Promise.all([
        level > 1
          ? transaction.levelDefinition.findUnique({
              where: { level: level - 1 },
            })
          : Promise.resolve(null),
        transaction.levelDefinition.findUnique({
          where: { level: level + 1 },
        }),
        transaction.levelDefinition.findUnique({
          where: { threshold },
        }),
      ]);
      if (
        (level > 1 && !previous) ||
        (previous && threshold <= previous.threshold) ||
        (next && threshold >= next.threshold) ||
        (duplicate && duplicate.level !== level)
      ) {
        return null;
      }
      const definition = await transaction.levelDefinition.upsert({
        where: { level },
        update: { threshold, updatedById },
        create: { level, threshold, updatedById },
      });
      await this.audit.append(transaction, {
        action: 'levels.definition.updated',
        actorType: 'USER',
        actorId: updatedById,
        targetType: 'LevelDefinition',
        targetId: level.toString(),
        metadata: { level, threshold },
      });
      return definition;
    });
  }

  async sync(
    event: LevelEvent,
    targetLevel: number,
    balance: number,
  ): Promise<LevelSyncResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `levels:user:${event.userId}`);
      const processed = await transaction.processedEvent.findUnique({
        where: {
          eventId_consumerName: {
            eventId: event.eventId,
            consumerName: CONSUMER_NAME,
          },
        },
        select: { id: true },
      });
      if (processed) return { duplicate: true, transitions: [] };

      const latest = await transaction.levelTransition.findFirst({
        where: { userId: event.userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { toLevel: true },
      });
      const currentLevel = latest?.toLevel ?? 0;
      const transitions: LevelTransition[] = [];
      if (targetLevel > currentLevel) {
        for (
          let toLevel = currentLevel + 1;
          toLevel <= targetLevel;
          toLevel += 1
        ) {
          transitions.push(
            await this.appendTransition(
              transaction,
              event,
              toLevel - 1,
              toLevel,
              'UP',
              balance,
            ),
          );
        }
      } else if (targetLevel < currentLevel) {
        for (
          let fromLevel = currentLevel;
          fromLevel > targetLevel;
          fromLevel -= 1
        ) {
          transitions.push(
            await this.appendTransition(
              transaction,
              event,
              fromLevel,
              fromLevel - 1,
              'DOWN',
              balance,
            ),
          );
        }
      }
      await transaction.processedEvent.create({
        data: {
          eventId: event.eventId,
          consumerName: CONSUMER_NAME,
          eventName: event.eventName,
          eventVersion: event.eventVersion,
        },
      });
      return { duplicate: false, transitions };
    });
  }

  async history(
    userId: string,
    page: number,
    limit: number,
  ): Promise<LevelTransitionHistory> {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.levelTransition.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.levelTransition.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toDomain(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async appendTransition(
    transaction: TransactionClient,
    event: LevelEvent,
    fromLevel: number,
    toLevel: number,
    direction: LevelTransitionDirection,
    balance: number,
  ): Promise<LevelTransition> {
    const transition = await transaction.levelTransition.create({
      data: {
        userId: event.userId,
        fromLevel,
        toLevel,
        direction,
        balance,
        sourceEventId: event.eventId,
        sourceEventName: event.eventName,
        occurredAt: event.occurredAt,
      },
    });
    const payload = {
      userId: event.userId,
      fromLevel,
      toLevel,
      direction,
      balance,
    };
    await this.audit.append(transaction, {
      action: 'levels.changed',
      actorType: 'SYSTEM',
      targetType: 'LevelTransition',
      targetId: transition.id,
      metadata: payload,
      occurredAt: event.occurredAt.toISOString(),
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: LEVEL_CHANGED_EVENT,
        version: 1,
        category: 'integration',
        producer: CONSUMER_NAME,
        aggregate: { type: 'User', id: event.userId },
        causationId: event.eventId,
        payload,
      }),
    );
    return this.toDomain(transition);
  }

  private lock(
    transaction: TransactionClient,
    coordinate: string,
  ): Promise<number> {
    return transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))
    `;
  }

  private toDomain(row: TransitionRow): LevelTransition {
    return row;
  }
}

/**
 * 📈 Crossing three thresholds writes three lines. Space elevators keep logs.
 */
