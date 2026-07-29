/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/prisma-achievements.repository.ts
 *
 * 🎯 Purpose:
 * Persists achievement policy and immutable, reversible award history.
 *
 * 🧠 Responsibilities:
 * • serializes definitions, rules, and per-user awards;
 * • applies idempotency, repeatability, cooldown, and UTC daily caps;
 * • records manual and event-driven awards plus source rollback;
 * • appends Audit and Outbox evidence inside business transactions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  createEventEnvelope,
  type JsonValue,
  OutboxWriterService,
} from '@api/core/events';

import type {
  AchievementDefinitionWrite,
  AchievementRuleWrite,
  AchievementsRepository,
} from '../../domain/repositories/achievements.repository.interface';
import type {
  AchievementAward,
  AchievementAwardResult,
  AchievementConsumption,
  AchievementDefinition,
  AchievementEvent,
  AchievementRevokeResult,
  AchievementRule,
  AchievementWriteResult,
} from '../../domain/types/achievements.type';

const PRODUCER = 'dss.api.achievements';

const ruleInclude = { achievement: true } as const;
const awardInclude = {
  achievement: true,
  revocation: true,
} as const;

type RuleRow = Prisma.AchievementRuleGetPayload<{
  include: typeof ruleInclude;
}>;
type AwardRow = Prisma.AchievementAwardGetPayload<{
  include: typeof awardInclude;
}>;

@Injectable()
export class PrismaAchievementsRepository implements AchievementsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  definitions(includeInactive: boolean): Promise<AchievementDefinition[]> {
    return this.prisma.achievementDefinition.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async writeDefinition(
    input: AchievementDefinitionWrite,
  ): Promise<AchievementWriteResult<AchievementDefinition>> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.lock(transaction, 'achievements:definitions');
        if (input.id) {
          const exists = await transaction.achievementDefinition.findUnique({
            where: { id: input.id },
            select: { id: true },
          });
          if (!exists) return { status: 'NOT_FOUND', value: null };
        }
        const definition = input.id
          ? await transaction.achievementDefinition.update({
              where: { id: input.id },
              data: {
                key: input.key,
                name: input.name,
                slug: input.slug,
                description: input.description,
                color: input.color,
                badge: input.badge,
                isActive: input.isActive,
                updatedById: input.actorId,
              },
            })
          : await transaction.achievementDefinition.create({
              data: {
                key: input.key,
                name: input.name,
                slug: input.slug,
                description: input.description,
                color: input.color,
                badge: input.badge,
                isActive: input.isActive,
                createdById: input.actorId,
                updatedById: input.actorId,
              },
            });
        await this.record(
          transaction,
          input.id ? 'definition.updated' : 'definition.created',
          input.actorId,
          'AchievementDefinition',
          definition.id,
          {
            achievementId: definition.id,
            key: definition.key,
            name: definition.name,
            isActive: definition.isActive,
          },
        );
        return { status: 'OK', value: definition };
      });
    } catch (error) {
      if (this.uniqueConflict(error)) {
        return { status: 'CONFLICT', value: null };
      }
      throw error;
    }
  }

  async rules(includeDisabled: boolean): Promise<AchievementRule[]> {
    const rows = await this.prisma.achievementRule.findMany({
      where: includeDisabled ? undefined : { enabled: true },
      include: ruleInclude,
      orderBy: [{ eventName: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toRule(row));
  }

  async writeRule(
    input: AchievementRuleWrite,
  ): Promise<AchievementWriteResult<AchievementRule>> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.lock(transaction, 'achievements:rules');
        const [achievement, existing] = await Promise.all([
          transaction.achievementDefinition.findUnique({
            where: { id: input.achievementId },
            select: { id: true },
          }),
          input.id
            ? transaction.achievementRule.findUnique({
                where: { id: input.id },
                select: { id: true },
              })
            : Promise.resolve(null),
        ]);
        if (!achievement || (input.id && !existing)) {
          return { status: 'NOT_FOUND', value: null };
        }
        const rule = input.id
          ? await transaction.achievementRule.update({
              where: { id: input.id },
              data: {
                achievementId: input.achievementId,
                eventName: input.eventName,
                recipientPayloadKey: input.recipientPayloadKey,
                repeatable: input.repeatable,
                cooldownHours: input.cooldownHours,
                dailyCap: input.dailyCap,
                enabled: input.enabled,
                updatedById: input.actorId,
              },
              include: ruleInclude,
            })
          : await transaction.achievementRule.create({
              data: {
                achievementId: input.achievementId,
                eventName: input.eventName,
                recipientPayloadKey: input.recipientPayloadKey,
                repeatable: input.repeatable,
                cooldownHours: input.cooldownHours,
                dailyCap: input.dailyCap,
                enabled: input.enabled,
                createdById: input.actorId,
                updatedById: input.actorId,
              },
              include: ruleInclude,
            });
        await this.record(
          transaction,
          input.id ? 'rule.updated' : 'rule.created',
          input.actorId,
          'AchievementRule',
          rule.id,
          {
            ruleId: rule.id,
            achievementId: rule.achievementId,
            eventName: rule.eventName,
            enabled: rule.enabled,
          },
        );
        return { status: 'OK', value: this.toRule(rule) };
      });
    } catch (error) {
      if (this.uniqueConflict(error)) {
        return { status: 'CONFLICT', value: null };
      }
      throw error;
    }
  }

  async matchingRules(eventName: string): Promise<AchievementRule[]> {
    const rows = await this.prisma.achievementRule.findMany({
      where: {
        eventName,
        enabled: true,
        achievement: { isActive: true },
      },
      include: ruleInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => this.toRule(row));
  }

  async consume(
    rule: AchievementRule,
    event: AchievementEvent,
    userId: string,
  ): Promise<AchievementConsumption> {
    return this.prisma.$transaction(async (transaction) => {
      const consumerName = `${PRODUCER}:${rule.id}`;
      await this.lock(
        transaction,
        `achievements:award:${userId}:${rule.achievementId}`,
      );
      const processed = await transaction.processedEvent.findUnique({
        where: {
          eventId_consumerName: {
            eventId: event.eventId,
            consumerName,
          },
        },
        select: { id: true },
      });
      if (processed) {
        return { ruleId: rule.id, status: 'DUPLICATE', award: null };
      }
      const activeAward = await transaction.achievementAward.findFirst({
        where: {
          userId,
          achievementId: rule.achievementId,
          revocation: null,
        },
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
        (await this.dailyCount(
          transaction,
          rule.id,
          userId,
          event.occurredAt,
        )) >= rule.dailyCap
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
      await this.markProcessed(transaction, event, consumerName);
      await this.recordAward(transaction, 'awarded', null, award);
      return {
        ruleId: rule.id,
        status: 'AWARDED',
        award: this.toAward(award),
      };
    });
  }

  async manualAward(
    userId: string,
    achievementId: string,
    reason: string,
    actorId: string,
  ): Promise<AchievementAwardResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(
        transaction,
        `achievements:award:${userId}:${achievementId}`,
      );
      const [user, achievement, existing] = await Promise.all([
        transaction.user.findUnique({
          where: { id: userId },
          select: { id: true },
        }),
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
      if (!achievement) {
        return { status: 'ACHIEVEMENT_NOT_FOUND', award: null };
      }
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
      await this.recordAward(transaction, 'awarded', actorId, award);
      return { status: 'OK', award: this.toAward(award) };
    });
  }

  async revoke(
    awardId: string,
    reason: string,
    actorId: string | null,
  ): Promise<AchievementRevokeResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `achievements:revoke:${awardId}`);
      const award = await transaction.achievementAward.findUnique({
        where: { id: awardId },
        include: awardInclude,
      });
      if (!award) return { status: 'NOT_FOUND', award: null };
      if (award.revocation) {
        return { status: 'ALREADY_REVOKED', award: null };
      }
      const revocation = await transaction.achievementAwardRevocation.create({
        data: { awardId, reason, revokedById: actorId },
      });
      const revoked = { ...award, revocation };
      await this.recordAward(transaction, 'revoked', actorId, revoked);
      return { status: 'OK', award: this.toAward(revoked) };
    });
  }

  async rollbackSource(
    sourceType: string,
    sourceId: string,
    reason: string,
    actorId: string | null,
  ): Promise<AchievementAward[]> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(
        transaction,
        `achievements:source:${sourceType}:${sourceId}`,
      );
      const awards = await transaction.achievementAward.findMany({
        where: { sourceType, sourceId, revocation: null },
        include: awardInclude,
        orderBy: { id: 'asc' },
      });
      const revoked: AchievementAward[] = [];
      for (const award of awards) {
        const revocation = await transaction.achievementAwardRevocation.create({
          data: { awardId: award.id, reason, revokedById: actorId },
        });
        const record = { ...award, revocation };
        await this.recordAward(transaction, 'revoked', actorId, record);
        revoked.push(this.toAward(record));
      }
      return revoked;
    });
  }

  async awards(
    userId: string,
    includeRevoked: boolean,
  ): Promise<AchievementAward[]> {
    const rows = await this.prisma.achievementAward.findMany({
      where: {
        userId,
        ...(includeRevoked ? {} : { revocation: null }),
      },
      include: awardInclude,
      orderBy: [{ awardedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.toAward(row));
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

  private recordAward(
    transaction: TransactionClient,
    action: 'awarded' | 'revoked',
    actorId: string | null,
    award: AwardRow,
  ): Promise<void> {
    return this.record(
      transaction,
      `award.${action}`,
      actorId,
      'AchievementAward',
      award.id,
      {
        awardId: award.id,
        userId: award.userId,
        achievementId: award.achievementId,
        kind: award.kind,
        sourceType: award.sourceType,
        sourceId: award.sourceId,
      },
    );
  }

  private async record(
    transaction: TransactionClient,
    action: string,
    actorId: string | null,
    targetType: string,
    targetId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const jsonPayload = payload as JsonValue;
    await this.audit.append(transaction, {
      action: `achievements.${action}`,
      actorType: actorId ? 'USER' : 'SYSTEM',
      ...(actorId ? { actorId } : {}),
      targetType,
      targetId,
      metadata: jsonPayload,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `achievements.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        aggregate: { type: targetType, id: targetId },
        ...(actorId ? { actorId } : {}),
        payload: jsonPayload,
      }),
    );
  }

  private toRule(row: RuleRow): AchievementRule {
    return row;
  }

  private toAward(row: AwardRow): AchievementAward {
    return row;
  }

  private lock(
    transaction: TransactionClient,
    coordinate: string,
  ): Promise<number> {
    return transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))
    `;
  }

  private uniqueConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

/**
 * Duplicate events meet a lock, a marker, and a very polite “already earned.”
 */
