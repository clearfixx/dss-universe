/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/prisma-qualified-achievements.repository.ts
 * 🎯 Purpose: Owns transaction boundaries for qualification preparation, bounded progress and rule application.
 * 🧠 Responsibilities: Locks source coordinates before pair writes and rereads eligibility after each guard.
 * 🏗️ Architecture: Private owner adapter; composes only Achievements writers and core evidence.
 * ⚠️ Important: No producer journal, queue or root admission is activated by this repository.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { OutboxWriterService } from '@api/core/events';
import { QualificationBlockedError } from '../../domain/errors/qualification-blocked.error';
import type {
  QualificationStep,
  QualifiedAchievementsRepository,
} from '../../domain/repositories/qualified-achievements.repository.interface';
import type {
  AchievementConsumption,
  AchievementEvent,
  AchievementRule,
} from '../../domain/types/achievements.type';
import type {
  AchievementFactReference,
  QualifiedAchievementCommand,
  QualifiedAchievementEvent,
  QualifiedAchievementFact,
  QualifiedAchievementOutcome,
} from '../../domain/types/qualified-achievement.type';
import { AchievementEvidenceWriter } from './achievement-evidence.writer';
import { AchievementRuleAwardWriter } from './achievement-rule-award.writer';
import {
  achievementLegacyCoordinates,
  qualifiedFactView,
} from './achievement-qualified-facts';
import {
  qualifiedEventProjectionKey,
  readQualifiedEventProjection,
} from './qualified-achievement-event.projection';
import {
  lockAchievementCompatibilitySources,
  lockAchievementQualifiedSources,
} from './achievement-source-locks';
import {
  QualifiedAchievementFactsWriter,
  qualificationScopes,
} from './qualified-achievement-facts.writer';
import {
  QualifiedAchievementRetirementWriter,
  qualificationContinuation,
} from './qualified-achievement-retirement.writer';

@Injectable()
export class PrismaQualifiedAchievementsRepository implements QualifiedAchievementsRepository {
  private readonly facts: QualifiedAchievementFactsWriter;
  private readonly retirement: QualifiedAchievementRetirementWriter;
  private readonly awards: AchievementRuleAwardWriter;
  constructor(
    private readonly prisma: PrismaService,
    audit: AuditWriterService,
    outbox: OutboxWriterService,
  ) {
    const evidence = new AchievementEvidenceWriter(audit, outbox);
    this.facts = new QualifiedAchievementFactsWriter(evidence);
    this.retirement = new QualifiedAchievementRetirementWriter(evidence);
    this.awards = new AchievementRuleAwardWriter(evidence);
  }

  async prepare(command: QualifiedAchievementCommand): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const anchors = command.mappings?.length
          ? await transaction.achievementAward.findMany({
              where: {
                id: { in: command.mappings.map((mapping) => mapping.awardId) },
              },
              select: { sourceType: true, sourceId: true, sourceEventId: true },
            })
          : [];
        const legacyCoordinates = anchors.flatMap((award) =>
          award.sourceEventId
            ? achievementLegacyCoordinates(
                award.sourceType,
                award.sourceId,
                award.sourceEventId,
              )
            : [],
        );
        await this.lockSources(
          transaction,
          command.facts,
          command.event,
          legacyCoordinates,
        );
        await this.facts.prepare(transaction, command);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.modelName === 'AchievementSourceFact'
      )
        throw new QualificationBlockedError('FACT_CONFLICT');
      throw error;
    }
  }

  resolveLegacy(
    event: AchievementEvent,
    rollback: { sourceType: string; sourceId: string } | null,
  ): ReturnType<QualifiedAchievementsRepository['resolveLegacy']> {
    return this.prisma.$transaction(async (transaction) => {
      const coordinates = achievementLegacyCoordinates(
        event.sourceType,
        event.sourceId,
        event.eventId,
      );
      if (rollback)
        coordinates.push({
          sourceKind: rollback.sourceType,
          sourceId: rollback.sourceId,
        });
      await lockAchievementCompatibilitySources(transaction, coordinates);
      let enrolled = false;
      for (const coordinate of coordinates) {
        if (
          await transaction.achievementSourceCursor.findFirst({
            where: coordinate,
            select: { id: true },
          })
        ) {
          enrolled = true;
          break;
        }
      }
      if (!event.producer)
        return enrolled ? { status: 'BLOCKED' } : { status: 'UNENROLLED' };
      const facts = await transaction.achievementSourceFact.findMany({
        where: { producer: event.producer, canonicalEventId: event.eventId },
        include: { cursor: true },
        orderBy: { id: 'asc' },
        take: 65,
      });
      if (facts.length === 0) {
        const target = await transaction.achievementSourceFact.findFirst({
          where: {
            producer: event.producer,
            qualificationEventId: event.eventId,
          },
          select: { id: true },
        });
        return enrolled || target
          ? { status: 'BLOCKED' }
          : { status: 'UNENROLLED' };
      }
      if (facts.length > 64) return { status: 'BLOCKED' };
      const projections = facts
        .map((fact) => readQualifiedEventProjection(fact.eventProjection))
        .filter((projection) => projection !== null);
      const projection = projections[0];
      if (
        !projection ||
        projections.some(
          (candidate) =>
            qualifiedEventProjectionKey(candidate) !==
            qualifiedEventProjectionKey(projection),
        ) ||
        projection.event.eventName !== event.eventName ||
        projection.event.eventVersion !== event.eventVersion ||
        projection.event.producer !== event.producer ||
        projection.event.sourceType !== event.sourceType ||
        projection.event.sourceId !== event.sourceId ||
        new Date(projection.event.occurredAt).getTime() !==
          event.occurredAt.getTime()
      )
        return { status: 'BLOCKED' };
      return {
        status: 'MAPPED',
        command: {
          event: projection.event,
          facts: facts.map((fact) => qualifiedFactView(fact, fact.cursor)),
          contribution: projection.contribution,
        },
      };
    });
  }

  advanceSources(
    facts: readonly QualifiedAchievementFact[],
  ): Promise<QualificationStep> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockSources(transaction, facts);
      for (const scope of qualificationScopes({ facts })) {
        const cursor =
          await transaction.achievementSourceCursor.findUniqueOrThrow({
            where: { producer_sourceKind_sourceId: scope },
          });
        const result = await this.retirement.advance(transaction, cursor);
        if (result.status !== 'READY') return result;
      }
      return { status: 'READY', examined: 0 };
    });
  }

  consumeRule(
    command: QualifiedAchievementCommand,
    contribution: AchievementFactReference,
    rule: AchievementRule,
    event: AchievementEvent,
    recipientId: string,
  ): Promise<
    | AchievementConsumption
    | Extract<QualifiedAchievementOutcome, { status: 'CONTINUE' }>
  > {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockSources(transaction, command.facts, command.event);
      for (const scope of qualificationScopes(command)) {
        const state =
          await transaction.achievementSourceCursor.findUniqueOrThrow({
            where: { producer_sourceKind_sourceId: scope },
          });
        if (state.phase !== 'STABLE')
          return qualificationContinuation(state, 0);
      }
      const fact = await transaction.achievementSourceFact.findUniqueOrThrow({
        where: {
          producer_producerFactId: {
            producer: contribution.producer,
            producerFactId: contribution.factId,
          },
        },
        include: { cursor: true },
      });
      if (fact.action !== 'QUALIFY' || fact.canonicalEventId !== event.eventId)
        throw new QualificationBlockedError('FACT_CONFLICT');
      if (fact.cursor.targetRevision !== fact.revision)
        return this.awards.ignore(transaction, rule, event, recipientId);
      return this.awards.consume(transaction, rule, event, recipientId, {
        cursorId: fact.cursorId,
        factId: fact.id,
        qualificationRevision: fact.revision,
      });
    });
  }

  private async lockSources(
    transaction: TransactionClient,
    facts: readonly QualifiedAchievementFact[],
    event?: QualifiedAchievementEvent,
    additionalCoordinates: readonly {
      sourceKind: string;
      sourceId: string;
    }[] = [],
  ): Promise<void> {
    const scopes = qualificationScopes({ facts });
    await lockAchievementCompatibilitySources(transaction, [
      ...scopes,
      ...additionalCoordinates,
      ...(event
        ? achievementLegacyCoordinates(
            event.sourceType,
            event.sourceId,
            event.eventId,
          )
        : []),
    ]);
    await lockAchievementQualifiedSources(transaction, scopes);
  }
}
