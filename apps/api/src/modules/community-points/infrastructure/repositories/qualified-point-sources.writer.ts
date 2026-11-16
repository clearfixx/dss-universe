/** DSS Universe — private, bounded source enrolment and retirement.
 * Each qualifying event contributes at most one entry. The cursor retains one
 * current qualified entry; command-local legacy witnesses are bounded by V1.
 * Root attestation is mandatory; no canonical/foreign tables are read here.
 */
import type { CommunityPointSourceCursor } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import { PointQualificationBlockedError } from '../../domain/errors/point-qualification-blocked.error';
import type {
  QualifiedPointCommand,
  QualifiedPointFact,
} from '../../domain/types/qualified-points.type';
import { PrismaCommunityPointsRepository } from './prisma-community-points.repository';
import {
  pointFactData,
  pointScopeKey,
  pointScopes,
  samePointFact,
} from './qualified-point-data';

function blocked(): never {
  throw new PointQualificationBlockedError('LEGACY_EVIDENCE_REQUIRED');
}
function conflict(): never {
  throw new PointQualificationBlockedError('FACT_CONFLICT');
}

export class QualifiedPointSourcesWriter {
  constructor(private readonly ledger: PrismaCommunityPointsRepository) {}

  async prepare(tx: TransactionClient, command: QualifiedPointCommand) {
    const cursors = new Map<string, CommunityPointSourceCursor>();
    for (const scope of pointScopes(command)) {
      const where = { producer_sourceKind_sourceId: scope };
      const cursor =
        (await tx.communityPointSourceCursor.findUnique({ where })) ??
        (await tx.communityPointSourceCursor.create({ data: scope }));
      cursors.set(pointScopeKey(scope), cursor);
    }
    // Witness qualification rows precede their withdrawal rows.
    for (const fact of [...command.facts].sort((a, b) =>
      a.action === b.action ? 0 : a.action === 'QUALIFY' ? -1 : 1,
    )) {
      const cursor = cursors.get(pointScopeKey(fact));
      if (!cursor) conflict();
      const data = pointFactData(fact, cursor.id);
      const existing = await tx.communityPointSourceFact.findUnique({
        where: {
          producer_factId: { producer: fact.producer, factId: fact.factId },
        },
      });
      const byRevision = await tx.communityPointSourceFact.findUnique({
        where: {
          cursorId_revision: {
            cursorId: cursor.id,
            revision: BigInt(fact.revision),
          },
        },
      });
      if (existing ? !samePointFact(existing, data) : byRevision !== null)
        conflict();
      if (!existing) await tx.communityPointSourceFact.create({ data });
    }

    let applied = false;
    for (const scope of pointScopes(command)) {
      const key = pointScopeKey(scope),
        cursor = cursors.get(key)!;
      const facts = command.facts.filter((f) => pointScopeKey(f) === key);
      let retired = facts.reduce(
        (max, f) =>
          BigInt(f.retiredThroughRevision) > max
            ? BigInt(f.retiredThroughRevision)
            : max,
        cursor.retiredThroughRevision,
      );
      const legacyRevocation = await tx.communityPointRevokedSource.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: scope.sourceKind,
            sourceId: scope.sourceId,
          },
        },
      });
      if (legacyRevocation) {
        const proof = await tx.communityPointSourceFact.findFirst({
          where: {
            cursorId: cursor.id,
            canonicalEventId: legacyRevocation.sourceEventId,
            action: 'WITHDRAW',
          },
        });
        if (!proof) blocked();
        if (proof.retiredThroughRevision > retired)
          retired = proof.retiredThroughRevision;
      }

      const candidates = new Map<
        string,
        { entryId: string; qualificationId: string; revision: bigint }
      >();
      if (cursor.activeEntryId)
        candidates.set(cursor.activeEntryId, {
          entryId: cursor.activeEntryId,
          qualificationId: cursor.activeQualificationId!,
          revision: cursor.activeQualificationRevision,
        });
      for (const fact of facts.filter((f) => f.action === 'QUALIFY')) {
        const entry = await this.adopt(tx, fact);
        if (entry)
          candidates.set(entry.id, {
            entryId: entry.id,
            qualificationId: fact.qualificationId,
            revision: BigInt(fact.qualificationRevision),
          });
      }
      const active: {
        entryId: string;
        qualificationId: string;
        revision: bigint;
      }[] = [];
      for (const entry of candidates.values()) {
        if (entry.revision <= retired) {
          const reversed = await this.ledger.reverseInTransaction(
            tx,
            entry.entryId,
            undefined,
            'Source qualification was withdrawn.',
            new Date(command.event.occurredAt),
          );
          applied ||= reversed !== null;
        } else {
          const row = await tx.communityPointEntry.findUniqueOrThrow({
            where: { id: entry.entryId },
            select: { reversal: { select: { id: true } } },
          });
          if (!row.reversal) active.push(entry);
        }
      }
      if (active.length > 1) blocked();
      const highest = facts
        .filter((f) => f.action === 'QUALIFY')
        .reduce<QualifiedPointFact | null>(
          (max, f) =>
            !max ||
            BigInt(f.qualificationRevision) > BigInt(max.qualificationRevision)
              ? f
              : max,
          null,
        );
      const newer =
        highest &&
        BigInt(highest.qualificationRevision) >
          cursor.activeQualificationRevision
          ? highest
          : null;
      const qualificationId =
        newer?.qualificationId ?? cursor.activeQualificationId;
      const qualificationRevision = newer
        ? BigInt(newer.qualificationRevision)
        : cursor.activeQualificationRevision;
      if (
        active[0] &&
        (active[0].revision !== qualificationRevision ||
          active[0].qualificationId !== qualificationId)
      )
        conflict();
      const updated = await tx.communityPointSourceCursor.update({
        where: { id: cursor.id },
        data: {
          retiredThroughRevision: retired,
          activeQualificationId: qualificationId,
          activeQualificationRevision: qualificationRevision,
          activeEntryId: active[0]?.entryId ?? null,
        },
      });
      cursors.set(key, updated);
    }
    return {
      cursors,
      applied,
      withdrawal: command.facts.find((f) => f.action === 'WITHDRAW') ?? null,
    };
  }

  private async adopt(tx: TransactionClient, fact: QualifiedPointFact) {
    const entry = await tx.communityPointEntry.findUnique({
      where: { sourceEventId: fact.qualificationEventId },
      include: { qualification: true },
    });
    if (!entry) return null;
    const q = fact.qualification;
    if (
      entry.reversesEntryId !== null ||
      entry.userId !== q.recipientId ||
      entry.sourceEventName !== q.eventName ||
      entry.actorId !== q.actorId ||
      entry.sourceType !== q.sourceType ||
      entry.sourceId !== q.sourceId ||
      entry.occurredAt.toISOString() !== q.occurredAt
    )
      blocked();
    if (entry.qualification) {
      if (
        entry.qualification.producer !== fact.producer ||
        entry.qualification.qualificationFactId !== fact.factId
      )
        conflict();
      return entry;
    }
    const marker = await tx.processedEvent.findUnique({
      where: {
        eventId_consumerName: {
          eventId: fact.qualificationEventId,
          consumerName: 'dss.api.community-points',
        },
      },
    });
    const rule = await tx.communityPointRule.findUnique({
      where: { key: entry.ruleKey },
    });
    if (
      !marker ||
      marker.eventName !== q.eventName ||
      marker.eventVersion !== q.eventVersion ||
      !rule ||
      rule.eventName !== q.eventName ||
      (rule.payloadValue !== null && rule.payloadValue !== q.value)
    )
      blocked();
    await tx.communityPointQualification.create({
      data: {
        entryId: entry.id,
        producer: fact.producer,
        qualificationFactId: fact.factId,
      },
    });
    return entry;
  }
}
