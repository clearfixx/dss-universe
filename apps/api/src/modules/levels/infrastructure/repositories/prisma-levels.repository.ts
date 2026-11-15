/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/infrastructure/repositories/prisma-levels.repository.ts
 *
 * 🎯 Purpose:
 * Persists monotonic definitions and reads immutable level transition history.
 *
 * 🧠 Responsibilities:
 * • validates neighboring thresholds transactionally;
 * • appends Audit beside definition updates;
 * • paginates retained transition history without rewriting it.
 *
 * 🏗️ Architecture:
 * Levels-owned settings/history persistence; synchronization has its own writer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';

import type { LevelsRepository } from '../../domain/repositories/levels.repository.interface';
import type {
  LevelDefinition,
  LevelTransition,
  LevelTransitionDirection,
  LevelTransitionHistory,
} from '../../domain/types/levels.type';

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
