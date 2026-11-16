/** DSS Universe — private qualified Points transactions.
 * Each facet commits its receipt with its own effects. No queue, root receipt,
 * private producer table or automatic work is involved in this repository.
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { COMMUNITY_POINTS_REPOSITORY } from '../../domain/repositories/community-points.repository.interface';
import type { QualifiedPointsRepository } from '../../domain/repositories/qualified-points.repository.interface';
import { PointQualificationBlockedError } from '../../domain/errors/point-qualification-blocked.error';
import { validateQualifiedPointCommand } from '../../domain/qualified-points.validation';
import type {
  PointFacet,
  PointFacetResult,
  QualifiedPointCommand,
} from '../../domain/types/qualified-points.type';
import { PrismaCommunityPointsRepository } from './prisma-community-points.repository';
import { QualifiedPointSourcesWriter } from './qualified-point-sources.writer';
import { pointCommandDigest, pointScopeKey } from './qualified-point-data';
import { lockPointSources } from './point-source-locks';

function conflict(): never {
  throw new PointQualificationBlockedError('FACT_CONFLICT');
}
function legacyRequired(): never {
  throw new PointQualificationBlockedError('LEGACY_EVIDENCE_REQUIRED');
}
function result(
  facet: PointFacet,
  disposition: string,
  replayed: boolean,
): PointFacetResult {
  if (
    facet === 'CONTROL' &&
    (disposition === 'APPLIED' || disposition === 'NO_SOURCE_EFFECT')
  )
    return { facet, disposition, replayed };
  if (
    facet === 'CONTRIBUTION' &&
    (disposition === 'APPLIED' ||
      disposition === 'NO_MATCH' ||
      disposition === 'CAPPED' ||
      disposition === 'SOURCE_REVOKED')
  )
    return { facet, disposition, replayed };
  return conflict();
}

@Injectable()
export class PrismaQualifiedPointsRepository implements QualifiedPointsRepository {
  private readonly sources: QualifiedPointSourcesWriter;
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COMMUNITY_POINTS_REPOSITORY)
    private readonly ledger: PrismaCommunityPointsRepository,
  ) {
    this.sources = new QualifiedPointSourcesWriter(ledger);
  }

  async consumeFacet(
    command: QualifiedPointCommand,
    facet: PointFacet,
  ): Promise<PointFacetResult> {
    validateQualifiedPointCommand(command);
    if (!command.facets.includes(facet)) conflict();
    const commandDigest = pointCommandDigest(command);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'community-points:' + command.event.eventId},0))`;
      const existing = await tx.communityPointFacetReceipt.findUnique({
        where: { eventId_facet: { eventId: command.event.eventId, facet } },
      });
      if (existing) {
        if (
          existing.commandDigest !== commandDigest ||
          existing.recipientId !== command.recipientId ||
          existing.contractVersion !== 1
        )
          conflict();
        return result(facet, existing.disposition, true);
      }
      if (facet === 'CONTRIBUTION' && command.facets.includes('CONTROL')) {
        const control = await tx.communityPointFacetReceipt.findUnique({
          where: {
            eventId_facet: { eventId: command.event.eventId, facet: 'CONTROL' },
          },
        });
        if (!control || control.commandDigest !== commandDigest) conflict();
      }
      const coordinates = [
        { sourceKind: '@event', sourceId: command.event.eventId },
        ...command.facts.map((f) => ({
          sourceKind: f.sourceKind,
          sourceId: f.sourceId,
        })),
        ...command.facts.flatMap((f) =>
          f.qualification.sourceType && f.qualification.sourceId
            ? [
                {
                  sourceKind: f.qualification.sourceType,
                  sourceId: f.qualification.sourceId,
                },
              ]
            : [],
        ),
      ];
      if (command.event.sourceType && command.event.sourceId)
        coordinates.push({
          sourceKind: command.event.sourceType,
          sourceId: command.event.sourceId,
        });
      await lockPointSources(tx, coordinates);
      // Different scopes must not race to enrol conflicting uses of one fact ID.
      const identities = [
        ...new Set(
          command.facts.map((f) =>
            JSON.stringify(['qualified-point-fact', f.producer, f.factId]),
          ),
        ),
      ].sort();
      for (const identity of identities)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity},0))`;
      const state = await this.sources.prepare(tx, command);
      if (facet === 'CONTROL') {
        const disposition = state.applied ? 'APPLIED' : 'NO_SOURCE_EFFECT';
        if (state.applied && !state.withdrawal) conflict();
        await tx.communityPointFacetReceipt.create({
          data: {
            eventId: command.event.eventId,
            facet,
            contractVersion: 1,
            commandDigest,
            recipientId: command.recipientId,
            disposition,
            sourceFactProducer: state.withdrawal?.producer ?? null,
            sourceFactId: state.withdrawal?.factId ?? null,
          },
        });
        return result(facet, disposition, false);
      }

      const fact = command.facts.find(
        (f) =>
          f.producer === command.contribution?.producer &&
          f.factId === command.contribution.factId,
      );
      if (!fact) conflict();
      const previous = await tx.communityPointEntry.findUnique({
        where: { sourceEventId: command.event.eventId },
        include: { qualification: true },
      });
      if (previous) {
        if (
          !previous.qualification ||
          previous.qualification.producer !== fact.producer ||
          previous.qualification.qualificationFactId !== fact.factId ||
          previous.userId !== command.recipientId
        )
          legacyRequired();
        await this.receipt(
          tx,
          command,
          commandDigest,
          'APPLIED',
          previous.ruleKey,
          previous.id,
        );
        return result(facet, 'APPLIED', false);
      }
      const marker = await tx.processedEvent.findUnique({
        where: {
          eventId_consumerName: {
            eventId: command.event.eventId,
            consumerName: 'dss.api.community-points',
          },
        },
        select: { id: true },
      });
      if (marker) legacyRequired();
      const rules = await this.ledger.matchingRulesInTransaction(
        tx,
        command.event.eventName,
        command.event.value ?? undefined,
      );
      if (!rules.length) {
        await this.receipt(tx, command, commandDigest, 'NO_MATCH', null, null);
        return result(facet, 'NO_MATCH', false);
      }
      const rule = rules[0],
        cursor = state.cursors.get(pointScopeKey(fact));
      if (!cursor) conflict();
      if (BigInt(fact.qualificationRevision) <= cursor.retiredThroughRevision) {
        await this.receipt(
          tx,
          command,
          commandDigest,
          'SOURCE_REVOKED',
          rule.key,
          null,
        );
        return result(facet, 'SOURCE_REVOKED', false);
      }
      if (
        cursor.activeQualificationRevision !==
          BigInt(fact.qualificationRevision) ||
        cursor.activeQualificationId !== fact.qualificationId ||
        cursor.activeEntryId !== null
      )
        conflict();
      const consumed = await this.ledger.awardInTransaction(
        tx,
        {
          event: {
            eventId: command.event.eventId,
            eventName: command.event.eventName,
            eventVersion: command.event.eventVersion,
            occurredAt: new Date(command.event.occurredAt),
            actorId: command.event.actorId ?? undefined,
            aggregateType: command.event.sourceType ?? undefined,
            aggregateId: command.event.sourceId ?? undefined,
            payload:
              command.event.value === null
                ? {}
                : { value: command.event.value },
          },
          userId: command.recipientId,
          rule,
          reason: `Community activity reward: ${rule.key}.`,
        },
        'QUALIFIED',
      );
      if (consumed.status === 'CAPPED') {
        await this.receipt(
          tx,
          command,
          commandDigest,
          'CAPPED',
          rule.key,
          null,
        );
        return result(facet, 'CAPPED', false);
      }
      if (consumed.status !== 'AWARDED' || !consumed.entry) conflict();
      await tx.communityPointQualification.create({
        data: {
          entryId: consumed.entry.id,
          producer: fact.producer,
          qualificationFactId: fact.factId,
        },
      });
      await tx.communityPointSourceCursor.update({
        where: { id: cursor.id },
        data: { activeEntryId: consumed.entry.id },
      });
      await this.receipt(
        tx,
        command,
        commandDigest,
        'APPLIED',
        rule.key,
        consumed.entry.id,
      );
      return result(facet, 'APPLIED', false);
    });
  }

  private receipt(
    tx: TransactionClient,
    command: QualifiedPointCommand,
    commandDigest: string,
    disposition: string,
    ruleKey: string | null,
    contributionEntryId: string | null,
  ) {
    return tx.communityPointFacetReceipt.create({
      data: {
        eventId: command.event.eventId,
        facet: 'CONTRIBUTION',
        contractVersion: 1,
        commandDigest,
        recipientId: command.recipientId,
        disposition,
        ruleKey,
        contributionEntryId,
      },
    });
  }
}
