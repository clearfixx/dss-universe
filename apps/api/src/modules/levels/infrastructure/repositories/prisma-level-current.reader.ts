/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/infrastructure/repositories/prisma-level-current.reader.ts
 *
 * 🎯 Purpose:
 * Current level per member = target of the latest owned level transition,
 * the same rule the synchronization writer uses.
 *
 * ⚠️ Important:
 * One DISTINCT ON query per batch, ordered exactly like the writer (createdAt, id).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type { LevelCurrentReader } from '../../contracts/level-current-reader.contract';

@Injectable()
export class PrismaLevelCurrentReader implements LevelCurrentReader {
  constructor(private readonly prisma: PrismaService) {}

  async levelsFor(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, number>> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      { userId: string; toLevel: number }[]
    >(Prisma.sql`
      SELECT DISTINCT ON ("userId") "userId", "toLevel"
      FROM "level_transitions"
      WHERE "userId" IN (${Prisma.join(ids)})
      ORDER BY "userId", "createdAt" DESC, "id" DESC
    `);
    return new Map(rows.map((row) => [row.userId, Number(row.toLevel)]));
  }
}
