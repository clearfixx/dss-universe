/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/prisma-achievements.repository.ts
 *
 * 🎯 Purpose:
 * Persists owned achievement policy/history and delegates composed manual awards.
 *
 * 🧠 Responsibilities:
 * • serializes definitions, rules, and per-user awards;
 * • delegates idempotent grant policy to the shared private writer;
 * • orders compatibility/source guards before pair and revoke guards;
 * • records manual and event-driven awards plus source rollback;
 * • appends Audit and Outbox evidence inside business transactions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { OutboxWriterService } from '@api/core/events';

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

import {
  MANUAL_AWARD_TRANSACTION,
  type ManualAwardTransaction,
} from '../../contracts/manual-award-transaction.port';
import { awardInclude, type AwardRow } from './achievement-award.shape';
import { AchievementEvidenceWriter } from './achievement-evidence.writer';
import { AchievementRuleAwardWriter } from './achievement-rule-award.writer';
import { QualificationBlockedError } from '../../domain/errors/qualification-blocked.error';
import { achievementLegacyCoordinates } from './achievement-qualified-facts';
import {
  lockAchievementCompatibilitySources,
  lockAchievementQualifiedSources,
  lockAchievementAwardPairs,
  lockAchievementRevocations,
} from './achievement-source-locks';

const ruleInclude = { achievement: true } as const;

type RuleRow = Prisma.AchievementRuleGetPayload<{
  include: typeof ruleInclude;
}>;

@Injectable()
export class PrismaAchievementsRepository implements AchievementsRepository {
  private readonly evidence: AchievementEvidenceWriter;
  private readonly ruleAwards: AchievementRuleAwardWriter;
  constructor(
    private readonly prisma: PrismaService,
    audit: AuditWriterService,
    outbox: OutboxWriterService,
    @Inject(MANUAL_AWARD_TRANSACTION)
    private readonly manualAwards: ManualAwardTransaction,
  ) {
    this.evidence = new AchievementEvidenceWriter(audit, outbox);
    this.ruleAwards = new AchievementRuleAwardWriter(this.evidence);
  }

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
        await this.evidence.record(
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
        await this.evidence.record(
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
      const coordinates = achievementLegacyCoordinates(
        event.sourceType,
        event.sourceId,
        event.eventId,
      );
      await lockAchievementCompatibilitySources(transaction, coordinates);
      for (const coordinate of coordinates) {
        if (
          await transaction.achievementSourceCursor.findFirst({
            where: coordinate,
            select: { id: true },
          })
        ) {
          throw new QualificationBlockedError('LEGACY_FACT_REQUIRED');
        }
      }
      if (
        event.producer &&
        (await transaction.achievementSourceFact.findFirst({
          where: {
            producer: event.producer,
            qualificationEventId: event.eventId,
          },
          select: { id: true },
        }))
      )
        throw new QualificationBlockedError('LEGACY_FACT_REQUIRED');
      return this.ruleAwards.consume(transaction, rule, event, userId);
    });
  }

  manualAward(
    userId: string,
    achievementId: string,
    reason: string,
    actorId: string,
  ): Promise<AchievementAwardResult> {
    return this.manualAwards.award({ userId, achievementId, reason, actorId });
  }

  async revoke(
    awardId: string,
    reason: string,
    actorId: string | null,
  ): Promise<AchievementRevokeResult> {
    return this.prisma.$transaction(async (transaction) => {
      const anchor = await transaction.achievementAward.findUnique({
        where: { id: awardId },
        select: {
          userId: true,
          achievementId: true,
          sourceType: true,
          sourceId: true,
          sourceEventId: true,
          qualification: {
            select: {
              fact: {
                select: {
                  cursor: {
                    select: {
                      producer: true,
                      sourceKind: true,
                      sourceId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!anchor) return { status: 'NOT_FOUND', award: null };
      const coordinates = anchor.sourceEventId
        ? achievementLegacyCoordinates(
            anchor.sourceType,
            anchor.sourceId,
            anchor.sourceEventId,
          )
        : [];
      if (anchor.qualification)
        coordinates.push(anchor.qualification.fact.cursor);
      await lockAchievementCompatibilitySources(transaction, coordinates);
      const qualification =
        anchor.qualification ??
        (await transaction.achievementAwardQualification.findUnique({
          where: { awardId },
          select: {
            fact: {
              select: {
                cursor: {
                  select: { producer: true, sourceKind: true, sourceId: true },
                },
              },
            },
          },
        }));
      if (
        qualification &&
        !coordinates.some(
          (coordinate) =>
            coordinate.sourceKind === qualification.fact.cursor.sourceKind &&
            coordinate.sourceId === qualification.fact.cursor.sourceId,
        )
      )
        throw new Error(
          'Achievement binding changed outside the guarded owner path.',
        );
      await lockAchievementQualifiedSources(
        transaction,
        qualification ? [qualification.fact.cursor] : [],
      );
      await lockAchievementAwardPairs(transaction, [anchor]);
      await lockAchievementRevocations(transaction, [awardId]);
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
      await this.evidence.recordAward(transaction, 'revoked', actorId, revoked);
      return { status: 'OK', award: this.toAward(revoked) };
    });
  }

  async rollbackSource(
    sourceType: string,
    sourceId: string,
    reason: string,
    actorId: string | null,
    origin: 'ADMIN' | 'LEGACY_EVENT' = 'ADMIN',
  ): Promise<AchievementAward[]> {
    return this.prisma.$transaction(async (transaction) => {
      const coordinate = { sourceKind: sourceType, sourceId };
      await lockAchievementCompatibilitySources(transaction, [coordinate]);
      const scopes = await transaction.achievementSourceCursor.findMany({
        where: coordinate,
        select: { producer: true, sourceKind: true, sourceId: true },
      });
      if (origin === 'LEGACY_EVENT' && scopes.length > 0)
        throw new QualificationBlockedError('LEGACY_FACT_REQUIRED');
      if (
        origin === 'LEGACY_EVENT' &&
        (await transaction.achievementAwardQualification.findFirst({
          where: { award: { sourceType, sourceId } },
          select: { awardId: true },
        }))
      )
        throw new QualificationBlockedError('LEGACY_FACT_REQUIRED');
      await lockAchievementQualifiedSources(transaction, scopes);
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
      await lockAchievementAwardPairs(transaction, awards);
      await lockAchievementRevocations(
        transaction,
        awards.map((award) => award.id),
      );
      for (const candidate of awards) {
        const award = await transaction.achievementAward.findUniqueOrThrow({
          where: { id: candidate.id },
          include: awardInclude,
        });
        if (award.revocation) continue;
        const revocation = await transaction.achievementAwardRevocation.create({
          data: { awardId: award.id, reason, revokedById: actorId },
        });
        const record = { ...award, revocation };
        await this.evidence.recordAward(
          transaction,
          'revoked',
          actorId,
          record,
        );
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
