/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/prisma-manual-award.writer.ts
 *
 * 🎯 Purpose:
 * Persists manual awards while root supplies transaction-local recipient existence.
 *
 * 🧠 Responsibilities:
 * • keeps the pair lock and parallel recipient/definition/existing stage;
 * • preserves result precedence, award projection and atomic owned evidence.
 *
 * 🏗️ Architecture:
 * Stateless owner writer; infrastructure-only callback carries no profile facts.
 *
 * ⚠️ Important:
 * No foreign table reads, transaction lifetime or account eligibility policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import type { TransactionClient } from '@api/core/database';
import { OutboxWriterService } from '@api/core/events';
import type { ManualAchievementAward } from '../../contracts/manual-award-transaction.port';
import type { AchievementAwardResult } from '../../domain/types/achievements.type';
import { awardInclude } from './achievement-award.shape';
import { AchievementEvidenceWriter } from './achievement-evidence.writer';

@Injectable()
export class PrismaManualAwardWriter {
  private readonly evidence: AchievementEvidenceWriter;
  constructor(audit: AuditWriterService, outbox: OutboxWriterService) {
    this.evidence = new AchievementEvidenceWriter(audit, outbox);
  }
  async award(
    transaction: TransactionClient,
    input: ManualAchievementAward,
    recipientExists: () => Promise<boolean>,
  ): Promise<AchievementAwardResult> {
    const { userId, achievementId, reason, actorId } = input;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`achievements:award:${userId}:${achievementId}`}, 0))`;
    const [user, achievement, existing] = await Promise.all([
      recipientExists(),
      transaction.achievementDefinition.findFirst({
        where: { id: achievementId, isActive: true },
        select: { id: true },
      }),
      transaction.achievementAward.findFirst({
        where: { userId, achievementId, revocation: null },
        select: { id: true },
      }),
    ]);
    if (!user) return { status: 'USER_NOT_FOUND', award: null };
    if (!achievement) return { status: 'ACHIEVEMENT_NOT_FOUND', award: null };
    if (existing) return { status: 'CONFLICT', award: null };
    const award = await transaction.achievementAward.create({
      data: {
        userId,
        achievementId,
        kind: 'MANUAL',
        reason,
        awardedById: actorId,
      },
      include: awardInclude,
    });
    await this.evidence.recordAward(transaction, 'awarded', actorId, award);
    return { status: 'OK', award };
  }
}
