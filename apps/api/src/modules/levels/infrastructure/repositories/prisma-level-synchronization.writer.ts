/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/infrastructure/repositories/prisma-level-synchronization.writer.ts
 * 🎯 Purpose: Owns the existing user lock, definition reads and atomic transition history.
 * 🧠 Responsibilities: Keeps markers, transitions, Audit and Outbox on the caller transaction.
 * 🏗️ Architecture: Levels-owned infrastructure operations; no Points SQL or target policy.
 * ⚠️ Important: Root must acquire lockUser before reading balance and calling apply.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type {
  LevelDefinition,
  LevelEvent,
  LevelSyncResult,
  LevelTransition,
  LevelTransitionDirection,
} from '../../domain/types/levels.type';

const CONSUMER_NAME = 'dss.api.levels';
const LEVEL_CHANGED_EVENT = 'levels.changed.v1';

@Injectable()
export class PrismaLevelSynchronizationWriter {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  lockUser(transaction: TransactionClient, userId: string): Promise<number> {
    return transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`levels:user:${userId}`}, 0))`;
  }

  definitions(transaction: TransactionClient): Promise<LevelDefinition[]> {
    return transaction.levelDefinition.findMany({ orderBy: { level: 'asc' } });
  }

  async apply(
    transaction: TransactionClient,
    event: LevelEvent,
    targetLevel: number,
    balance: number,
  ): Promise<LevelSyncResult> {
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
    return transition;
  }
}

// The ladder keeps its own logbook; the transaction holds the railing.
