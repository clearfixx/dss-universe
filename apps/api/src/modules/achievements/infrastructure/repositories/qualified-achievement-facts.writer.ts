/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/qualified-achievement-facts.writer.ts
 * 🎯 Purpose: Enrols exact owner facts and reviewed legacy mappings under source guards.
 * 🧠 Responsibilities: Rejects identity conflicts, advances only verified targets and resets late-mapping frontiers.
 * 🏗️ Architecture: Private transaction writer; caller owns locks and transaction lifetime.
 * ⚠️ Important: Fact validation/attestation precedes this writer; a digest never replaces exact equality.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AchievementSourceCursor } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import { QualificationBlockedError } from '../../domain/errors/qualification-blocked.error';
import type {
  AchievementSourceScope,
  QualifiedAchievementCommand,
} from '../../domain/types/qualified-achievement.type';
import { AchievementEvidenceWriter } from './achievement-evidence.writer';
import {
  qualifiedEventProjection,
  qualifiedEventProjectionKey,
  readQualifiedEventProjection,
} from './qualified-achievement-event.projection';
import {
  achievementLegacyCoordinates,
  achievementScopeKey,
  identicalQualifiedFact,
  qualifiedFactData,
} from './achievement-qualified-facts';

export function qualificationScopes(
  command: Pick<QualifiedAchievementCommand, 'facts'>,
): AchievementSourceScope[] {
  const scopes = new Map<string, AchievementSourceScope>();
  for (const { producer, sourceKind, sourceId } of command.facts) {
    const scope = { producer, sourceKind, sourceId };
    scopes.set(achievementScopeKey(scope), scope);
  }
  return [...scopes.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, scope]) => scope);
}

export class QualifiedAchievementFactsWriter {
  constructor(private readonly evidence: AchievementEvidenceWriter) {}

  async prepare(
    transaction: TransactionClient,
    command: QualifiedAchievementCommand,
  ): Promise<void> {
    const cursors = new Map<string, AchievementSourceCursor>();
    for (const scope of qualificationScopes(command)) {
      const where = { producer_sourceKind_sourceId: scope };
      const cursor =
        (await transaction.achievementSourceCursor.findUnique({ where })) ??
        (await transaction.achievementSourceCursor.create({ data: scope }));
      cursors.set(achievementScopeKey(scope), cursor);
    }
    for (const fact of command.facts) {
      const cursor = cursors.get(achievementScopeKey(fact));
      if (!cursor) throw new QualificationBlockedError('FACT_CONFLICT');
      const data = qualifiedFactData(fact, cursor.id);
      const projection =
        fact.canonicalEventId === command.event.eventId
          ? qualifiedEventProjection(command.event, command.contribution)
          : null;
      const byIdentity = await transaction.achievementSourceFact.findUnique({
        where: {
          producer_producerFactId: {
            producer: fact.producer,
            producerFactId: fact.factId,
          },
        },
      });
      const byRevision = await transaction.achievementSourceFact.findUnique({
        where: {
          cursorId_revision: { cursorId: cursor.id, revision: data.revision },
        },
      });
      if (
        (byIdentity && !identicalQualifiedFact(byIdentity, data)) ||
        (byRevision && !identicalQualifiedFact(byRevision, data))
      )
        throw new QualificationBlockedError('FACT_CONFLICT');
      for (const existing of [byIdentity, byRevision]) {
        if (
          projection &&
          existing?.eventProjection !== null &&
          existing?.eventProjection !== undefined
        ) {
          const stored = readQualifiedEventProjection(existing.eventProjection);
          if (
            !stored ||
            qualifiedEventProjectionKey(stored) !==
              qualifiedEventProjectionKey(projection.projection)
          ) {
            throw new QualificationBlockedError('FACT_CONFLICT');
          }
        }
      }
      if (!byIdentity && !byRevision)
        await transaction.achievementSourceFact.create({
          data: {
            ...data,
            eventProjection: projection
              ? (JSON.parse(
                  JSON.stringify(projection.projection),
                ) as Prisma.InputJsonObject)
              : Prisma.DbNull,
            eventProjectionDigest: projection?.digest ?? null,
          },
        });
    }
    for (const mapping of command.mappings ?? []) {
      const fact = await transaction.achievementSourceFact.findUnique({
        where: {
          producer_producerFactId: {
            producer: mapping.qualification.producer,
            producerFactId: mapping.qualification.factId,
          },
        },
      });
      const cursor =
        fact &&
        [...cursors.values()].find(
          (candidate) => candidate.id === fact.cursorId,
        );
      const award = await transaction.achievementAward.findUnique({
        where: { id: mapping.awardId },
      });
      const legacyCoordinates =
        award?.sourceEventId &&
        achievementLegacyCoordinates(
          award.sourceType,
          award.sourceId,
          award.sourceEventId,
        );
      if (
        !fact ||
        !cursor ||
        !award ||
        fact.action !== 'QUALIFY' ||
        award.kind !== 'RULE' ||
        award.sourceEventId !== fact.qualificationEventId ||
        !legacyCoordinates ||
        !legacyCoordinates.some(
          (source) =>
            source.sourceKind === cursor.sourceKind &&
            source.sourceId === cursor.sourceId,
        )
      ) {
        throw new QualificationBlockedError('BLOCKED_LEGACY_MAPPING');
      }
      const existing =
        await transaction.achievementAwardQualification.findUnique({
          where: { awardId: award.id },
        });
      if (existing) {
        if (
          existing.cursorId !== cursor.id ||
          existing.factId !== fact.id ||
          existing.mappingEvidenceId !== mapping.evidenceId ||
          existing.mappingEvidenceDigest !== mapping.evidenceDigest
        ) {
          throw new QualificationBlockedError('BLOCKED_LEGACY_MAPPING');
        }
        continue;
      }
      await transaction.achievementAwardQualification.create({
        data: {
          awardId: award.id,
          cursorId: cursor.id,
          factId: fact.id,
          qualificationRevision: fact.revision,
          sourceEventId: fact.qualificationEventId,
          mappingEvidenceId: mapping.evidenceId,
          mappingEvidenceDigest: mapping.evidenceDigest,
        },
      });
      await this.evidence.record(
        transaction,
        'qualification.mapped',
        null,
        'AchievementAward',
        award.id,
        {
          awardId: award.id,
          factId: fact.producerFactId,
          mappingEvidenceId: mapping.evidenceId,
        },
      );
      if (
        fact.revision <= cursor.pendingRetiredThrough &&
        (cursor.phase === 'STABLE' || cursor.retirementAfterRevision !== null)
      ) {
        // Reset conservatively for any covered late mapping, including a previously STABLE prefix.
        const changed = await transaction.achievementSourceCursor.update({
          where: { id: cursor.id },
          data: {
            phase: 'RETIRING',
            retirementAfterRevision: null,
            retirementAfterAwardId: null,
            generation: { increment: 1 },
            progress: { increment: 1 },
          },
        });
        cursors.set(achievementScopeKey(changed), changed);
      }
    }
    for (const [key, cursor] of cursors) {
      const latest = command.facts
        .filter((fact) => achievementScopeKey(fact) === key)
        .reduce((left, right) =>
          BigInt(left.revision) > BigInt(right.revision) ? left : right,
        );
      if (BigInt(latest.revision) <= cursor.targetRevision) continue;
      const coverage = BigInt(latest.retiredThroughRevision);
      if (coverage < cursor.pendingRetiredThrough)
        throw new QualificationBlockedError('FACT_CONFLICT');
      await transaction.achievementSourceCursor.update({
        where: { id: cursor.id },
        data: {
          targetRevision: BigInt(latest.revision),
          pendingRetiredThrough: coverage,
          phase: 'RETIRING',
          generation: { increment: 1 },
        },
      });
    }
  }
}
