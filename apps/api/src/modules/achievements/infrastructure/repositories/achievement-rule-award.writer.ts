/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/achievement-rule-award.writer.ts
 * 🎯 Purpose: Retains the owned event/rule grant algorithm inside the caller's transaction.
 * 🧠 Responsibilities: Applies existing eligibility, marker and evidence semantics; binds qualified grants atomically.
 * 🏗️ Architecture: Private stateless owner writer; no transaction lifetime or foreign tables.
 * ⚠️ Important: Source guards and qualification validation precede this writer's pair guard.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';
import type {
  AchievementConsumption,
  AchievementEvent,
  AchievementRule,
} from '../../domain/types/achievements.type';
import { awardInclude } from './achievement-award.shape';
import {
  ACHIEVEMENTS_PRODUCER,
  AchievementEvidenceWriter,
} from './achievement-evidence.writer';

export type QualifiedAwardBinding = {
  cursorId: string;
  factId: string;
  qualificationRevision: bigint;
};

export class AchievementRuleAwardWriter {
  constructor(private readonly evidence: AchievementEvidenceWriter) {}

  async ignore(
    transaction: TransactionClient,
    rule: AchievementRule,
    event: AchievementEvent,
    userId: string,
  ): Promise<AchievementConsumption> {
    const consumerName = `${ACHIEVEMENTS_PRODUCER}:${rule.id}`;
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${`achievements:award:${userId}:${rule.achievementId}`}, 0))
    `;
    const processed = await transaction.processedEvent.findUnique({
      where: { eventId_consumerName: { eventId: event.eventId, consumerName } },
      select: { id: true },
    });
    if (processed) return { ruleId: rule.id, status: 'DUPLICATE', award: null };
    await this.markProcessed(transaction, event, consumerName);
    return { ruleId: rule.id, status: 'IGNORED', award: null };
  }

  async consume(
    transaction: TransactionClient,
    rule: AchievementRule,
    event: AchievementEvent,
    userId: string,
    binding?: QualifiedAwardBinding,
  ): Promise<AchievementConsumption> {
    const consumerName = `${ACHIEVEMENTS_PRODUCER}:${rule.id}`;
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${`achievements:award:${userId}:${rule.achievementId}`}, 0))
    `;
    const processed = await transaction.processedEvent.findUnique({
      where: { eventId_consumerName: { eventId: event.eventId, consumerName } },
      select: { id: true },
    });
    if (processed) return { ruleId: rule.id, status: 'DUPLICATE', award: null };

    const activeAward = await transaction.achievementAward.findFirst({
      where: { userId, achievementId: rule.achievementId, revocation: null },
      orderBy: [{ awardedAt: 'desc' }, { id: 'desc' }],
    });
    if (!rule.repeatable && activeAward) {
      await this.markProcessed(transaction, event, consumerName);
      return { ruleId: rule.id, status: 'IGNORED', award: null };
    }
    if (
      rule.cooldownHours > 0 &&
      activeAward &&
      activeAward.awardedAt.getTime() + rule.cooldownHours * 3_600_000 >
        event.occurredAt.getTime()
    ) {
      await this.markProcessed(transaction, event, consumerName);
      return { ruleId: rule.id, status: 'CAPPED', award: null };
    }
    if (
      rule.dailyCap !== null &&
      (await this.dailyCount(transaction, rule.id, userId, event.occurredAt)) >=
        rule.dailyCap
    ) {
      await this.markProcessed(transaction, event, consumerName);
      return { ruleId: rule.id, status: 'CAPPED', award: null };
    }
    const award = await transaction.achievementAward.create({
      data: {
        userId,
        achievementId: rule.achievementId,
        ruleId: rule.id,
        kind: 'RULE',
        reason: `Matched achievement event ${event.eventName}.`,
        sourceEventId: event.eventId,
        sourceEventName: event.eventName,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        awardedAt: event.occurredAt,
      },
      include: awardInclude,
    });
    if (binding) {
      await transaction.achievementAwardQualification.create({
        data: { ...binding, awardId: award.id, sourceEventId: event.eventId },
      });
    }
    await this.markProcessed(transaction, event, consumerName);
    await this.evidence.recordAward(transaction, 'awarded', null, award);
    return { ruleId: rule.id, status: 'AWARDED', award };
  }

  private async dailyCount(
    transaction: TransactionClient,
    ruleId: string,
    userId: string,
    occurredAt: Date,
  ): Promise<number> {
    const start = new Date(
      Date.UTC(
        occurredAt.getUTCFullYear(),
        occurredAt.getUTCMonth(),
        occurredAt.getUTCDate(),
      ),
    );
    const end = new Date(start.getTime() + 86_400_000);
    return transaction.achievementAward.count({
      where: {
        ruleId,
        userId,
        awardedAt: { gte: start, lt: end },
        revocation: null,
      },
    });
  }

  private markProcessed(
    transaction: TransactionClient,
    event: AchievementEvent,
    consumerName: string,
  ) {
    return transaction.processedEvent.create({
      data: {
        eventId: event.eventId,
        consumerName,
        eventName: event.eventName,
        eventVersion: event.eventVersion,
      },
    });
  }
}
