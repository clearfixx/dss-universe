/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/qualified-achievement-retirement.writer.ts
 * 🎯 Purpose: Advances one bounded owner inventory/retirement page without premature cursor completion.
 * 🧠 Responsibilities: Counts examined rows, preserves restart progress and commits revocations with evidence.
 * 🏗️ Architecture: Private transaction writer; source guards are held by its caller.
 * ⚠️ Important: LIMIT counts all bindings, including revoked ones; no active-row anti-join hides historical work.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AchievementSourceCursor } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import type { QualificationStep } from '../../domain/repositories/qualified-achievements.repository.interface';
import { awardInclude } from './achievement-award.shape';
import { AchievementEvidenceWriter } from './achievement-evidence.writer';
import {
  achievementInventoryWindow,
  achievementRetirementWindow,
} from './achievement-retirement-window.sql';
import {
  lockAchievementAwardPairs,
  lockAchievementRevocations,
} from './achievement-source-locks';

type RetirementCoordinate = { awardId: string; qualificationRevision: bigint };

export function qualificationContinuation(
  cursor: AchievementSourceCursor,
  examined: number,
): Extract<QualificationStep, { status: 'CONTINUE' }> {
  return {
    status: 'CONTINUE',
    examined,
    progress: {
      scope: {
        producer: cursor.producer,
        sourceKind: cursor.sourceKind,
        sourceId: cursor.sourceId,
      },
      generation: cursor.generation.toString(),
      sequence: cursor.progress.toString(),
    },
  };
}

export class QualifiedAchievementRetirementWriter {
  constructor(private readonly evidence: AchievementEvidenceWriter) {}

  async advance(
    transaction: TransactionClient,
    initial: AchievementSourceCursor,
  ): Promise<QualificationStep> {
    let cursor = initial;
    if (cursor.phase === 'STABLE') return { status: 'READY', examined: 0 };
    if (cursor.enrollmentState !== 'READY') {
      const inventory = await transaction.$queryRaw<{ id: string }[]>(
        achievementInventoryWindow({
          sourceKind: cursor.sourceKind,
          sourceId: cursor.sourceId,
          afterId: cursor.inventoryAfterId,
        }),
      );
      const bindings = await transaction.achievementAwardQualification.findMany(
        {
          where: { awardId: { in: inventory.map((award) => award.id) } },
          select: { awardId: true },
        },
      );
      const boundIds = new Set(bindings.map((binding) => binding.awardId));
      let lastId = cursor.inventoryAfterId;
      let examined = 0;
      for (const award of inventory) {
        examined++;
        if (!boundIds.has(award.id)) {
          await transaction.achievementSourceCursor.update({
            where: { id: cursor.id },
            data: {
              inventoryAfterId: lastId,
              enrollmentState: 'BLOCKED',
              progress: { increment: 1 },
            },
          });
          return {
            status: 'BLOCKED',
            code: 'BLOCKED_LEGACY_MAPPING',
            examined,
          };
        }
        // Other producer scopes remain distinct after their exact binding has been reviewed.
        lastId = award.id;
      }
      if (inventory.length > 0) {
        const progress = await transaction.achievementSourceCursor.update({
          where: { id: cursor.id },
          data: {
            inventoryAfterId: lastId,
            enrollmentState: 'PENDING',
            progress: { increment: 1 },
          },
        });
        return qualificationContinuation(progress, examined);
      }
      cursor = await transaction.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: {
          enrollmentState: 'READY',
          progress: { increment: 1 },
        },
      });
    }

    const bindings = await transaction.$queryRaw<RetirementCoordinate[]>(
      achievementRetirementWindow({
        cursorId: cursor.id,
        retiredThrough: cursor.pendingRetiredThrough,
        after:
          cursor.retirementAfterRevision === null ||
          cursor.retirementAfterAwardId === null
            ? null
            : {
                revision: cursor.retirementAfterRevision,
                awardId: cursor.retirementAfterAwardId,
              },
      }),
    );
    if (bindings.length === 0) {
      await transaction.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: {
          appliedRevision: cursor.targetRevision,
          retiredThrough: cursor.pendingRetiredThrough,
          phase: 'STABLE',
          progress: { increment: 1 },
        },
      });
      return { status: 'READY', examined: 0 };
    }
    const awards = await transaction.achievementAward.findMany({
      where: { id: { in: bindings.map((binding) => binding.awardId) } },
      select: { id: true, userId: true, achievementId: true },
    });
    await lockAchievementAwardPairs(transaction, awards);
    await lockAchievementRevocations(
      transaction,
      awards.map((award) => award.id),
    );
    const guarded = await transaction.achievementAward.findMany({
      where: { id: { in: bindings.map((binding) => binding.awardId) } },
      include: awardInclude,
    });
    const guardedById = new Map(guarded.map((award) => [award.id, award]));
    for (const binding of bindings) {
      const award = guardedById.get(binding.awardId);
      if (!award)
        throw new Error('Guarded achievement binding lost its award.');
      if (award.revocation) continue;
      const revocation = await transaction.achievementAwardRevocation.create({
        data: {
          awardId: award.id,
          reason: 'Source qualification retired.',
          revokedById: null,
        },
      });
      await this.evidence.recordAward(transaction, 'revoked', null, {
        ...award,
        revocation,
      });
    }
    const last = bindings[bindings.length - 1];
    const progress = await transaction.achievementSourceCursor.update({
      where: { id: cursor.id },
      data: {
        retirementAfterRevision: last.qualificationRevision,
        retirementAfterAwardId: last.awardId,
        progress: { increment: 1 },
      },
    });
    return qualificationContinuation(progress, bindings.length);
  }
}
