/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Qualification Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-qualification.adapter.ts
 * 🎯 Purpose: Compares owned producer views with canonical events before preparing O1 input.
 * 🧠 Responsibilities: Preserves safe facts and supports an existing caller-owned transaction.
 * 🏗️ Architecture: Inactive root read adapter; no eligibility, queue, activation or delivery seal.
 * ⚠️ Important: A prepared snapshot does not promise atomicity with later consumer transactions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  CanonicalOutboxReader,
  type CanonicalOutboxEvidence,
} from '@api/core/events/infrastructure';
import type { QualifiedAchievementCommand } from '@api/modules/achievements';
import type {
  QualifiedPointCommand,
  QualifiedPointFact,
  PointQualificationProjection,
} from '@api/modules/community-points';
import type { ReputationQualificationEvent } from '@api/modules/reputation';
import {
  PrismaReputationQualificationReader,
  type ReputationOriginalEvidenceInput,
} from '@api/modules/reputation/infrastructure';

const keys = ['recipientId', 'value', 'reversesEntryId'] as const;
function matches(
  expected: ReputationQualificationEvent,
  canonical: CanonicalOutboxEvidence | null,
): boolean {
  if (!canonical || !canonical.payload) return false;
  const reversal = expected.kind === 'REVERSAL';
  return (
    canonical.producer === 'dss.api.reputation' &&
    canonical.version === 1 &&
    canonical.category === 'integration' &&
    canonical.eventId === expected.eventId &&
    canonical.name ===
      (reversal
        ? 'reputation.direct.reversed.v1'
        : 'reputation.direct.changed.v1') &&
    canonical.aggregateType === 'ReputationEntry' &&
    canonical.aggregateId === expected.entryId &&
    canonical.actorId === expected.actorId &&
    canonical.occurredAt === expected.occurredAt &&
    Object.keys(canonical.payload).length === (reversal ? 3 : 2) &&
    canonical.payload.recipientId === expected.recipientId &&
    canonical.payload.value === expected.value &&
    (reversal
      ? canonical.payload.reversesEntryId === expected.originalEntryId
      : !Object.hasOwn(canonical.payload, 'reversesEntryId'))
  );
}

export async function lookupReputationOriginalEvidence(
  core: CanonicalOutboxReader,
  transaction: TransactionClient,
  input: ReputationOriginalEvidenceInput,
): Promise<
  | { status: 'VERIFIED'; eventId: string; occurredAt: string }
  | { status: 'BLOCKED' }
> {
  const candidates = await core.candidates(
    transaction,
    {
      producer: 'dss.api.reputation',
      aggregateType: 'ReputationEntry',
      aggregateId: input.entryId,
      eventName: 'reputation.direct.changed.v1',
    },
    keys,
  );
  if (candidates.length !== 1) return { status: 'BLOCKED' };
  const candidate = candidates[0];
  if (
    !matches(
      {
        ...input,
        kind: 'DIRECT',
        eventId: candidate.eventId,
        occurredAt: candidate.occurredAt,
        originalEntryId: null,
        provenance: 'VERIFIED_LEGACY',
        contractVersion: 1,
      },
      candidate,
    )
  )
    return { status: 'BLOCKED' };
  return {
    status: 'VERIFIED',
    eventId: candidate.eventId,
    occurredAt: candidate.occurredAt,
  };
}

export type PreparedReputationCommand =
  | { status: 'READY'; command: QualifiedAchievementCommand }
  | {
      status: 'BLOCKED';
      code:
        | 'INVALID_EVENT_ID'
        | 'MISSING_PRODUCER_EVIDENCE'
        | 'LEGACY_PROVENANCE_REQUIRED'
        | 'CANONICAL_EVIDENCE_MISMATCH';
    };

export type PreparedReputationOwners =
  | {
      status: 'READY';
      achievements: QualifiedAchievementCommand;
      points: QualifiedPointCommand;
    }
  | Extract<PreparedReputationCommand, { status: 'BLOCKED' }>;

@Injectable()
export class ReputationQualificationAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly owned: PrismaReputationQualificationReader,
    private readonly core: CanonicalOutboxReader,
  ) {}

  /** Caller holds one Repeatable Read snapshot, as admission already does.
   * The legacy preparation remains unchanged; the second owned view is read
   * from that same snapshot, never from a later independently opened transaction.
   */
  async prepareOwnersInTransaction(
    transaction: TransactionClient,
    eventId: string,
  ): Promise<PreparedReputationOwners> {
    const prepared = await this.prepareInTransaction(transaction, eventId);
    if (prepared.status === 'BLOCKED') return prepared;
    const view = await this.owned.read(transaction, eventId);
    if (!view || view.blocked)
      return { status: 'BLOCKED', code: 'MISSING_PRODUCER_EVIDENCE' };
    const pointsEvent = {
      eventId: view.event.eventId,
      eventName: prepared.command.event.eventName,
      eventVersion: 1,
      producer: 'dss.api.reputation',
      sourceType: 'ReputationEntry',
      sourceId: view.event.entryId,
      actorId: view.event.actorId,
      occurredAt: view.event.occurredAt,
      value: view.event.value,
    };
    const facts: QualifiedPointFact[] = [];
    for (const fact of prepared.command.facts) {
      const original = view.facts.find(
        (candidate) => candidate.factId === fact.qualificationFactId,
      );
      if (!original || original.action !== 'QUALIFY')
        return { status: 'BLOCKED', code: 'MISSING_PRODUCER_EVIDENCE' };
      const evidence = original.evidence;
      const qualification: PointQualificationProjection = {
        eventName:
          evidence.kind === 'DIRECT'
            ? 'reputation.direct.changed.v1'
            : 'reputation.direct.reversed.v1',
        eventVersion: 1,
        sourceType: 'ReputationEntry',
        sourceId: evidence.entryId,
        actorId: evidence.actorId,
        occurredAt: evidence.occurredAt,
        value: evidence.value,
        recipientId: evidence.recipientId,
      };
      facts.push({ ...fact, qualification });
    }
    return {
      status: 'READY',
      achievements: prepared.command,
      points: {
        contractVersion: 1,
        event: pointsEvent,
        recipientId: view.event.recipientId,
        facts,
        contribution: prepared.command.contribution,
        facets: facts.some((fact) => fact.action === 'WITHDRAW')
          ? ['CONTROL', 'CONTRIBUTION']
          : ['CONTRIBUTION'],
      },
    };
  }

  async prepare(eventId: string): Promise<PreparedReputationCommand> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eventId,
      )
    )
      return { status: 'BLOCKED', code: 'INVALID_EVENT_ID' };
    return this.prisma.$transaction(
      (transaction) => this.prepareInTransaction(transaction, eventId),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  /** The caller owns snapshot/isolation and transaction lifetime. */
  async prepareInTransaction(
    transaction: TransactionClient,
    eventId: string,
  ): Promise<PreparedReputationCommand> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eventId,
      )
    )
      return { status: 'BLOCKED', code: 'INVALID_EVENT_ID' };
    const view = await this.owned.read(transaction, eventId);
    if (!view)
      return {
        status: 'BLOCKED',
        code: 'MISSING_PRODUCER_EVIDENCE',
      } as const;
    if (view.blocked)
      return {
        status: 'BLOCKED',
        code: 'LEGACY_PROVENANCE_REQUIRED',
      } as const;
    const expected = [view.event, ...view.facts.map((fact) => fact.evidence)];
    const canonical = new Map<string, CanonicalOutboxEvidence | null>();
    for (const evidence of expected) {
      if (!canonical.has(evidence.eventId))
        canonical.set(
          evidence.eventId,
          await this.core.read(transaction, evidence.eventId, keys),
        );
      if (!matches(evidence, canonical.get(evidence.eventId) ?? null))
        return {
          status: 'BLOCKED',
          code: 'CANONICAL_EVIDENCE_MISMATCH',
        } as const;
    }
    const event = canonical.get(view.event.eventId)!;
    if (!event?.payload)
      return {
        status: 'BLOCKED',
        code: 'CANONICAL_EVIDENCE_MISMATCH',
      } as const;
    return {
      status: 'READY',
      command: {
        event: {
          eventId: event.eventId,
          eventName: event.name,
          eventVersion: event.version,
          producer: event.producer,
          sourceType: event.aggregateType,
          sourceId: event.aggregateId,
          occurredAt: event.occurredAt,
          payload: event.payload,
        },
        facts: view.facts.map((fact) => ({
          producer: 'dss.api.reputation',
          sourceKind: fact.scope === 'ENTRY' ? 'ReputationEntry' : '@event',
          sourceId: fact.sourceId,
          factId: fact.factId,
          canonicalEventId: fact.eventId,
          revision: fact.revision,
          action: fact.action,
          qualificationId: fact.qualification.factId,
          qualificationRevision: '1',
          qualificationEventId: fact.qualification.eventId,
          qualificationFactId: fact.qualification.factId,
          retiredThroughRevision: fact.action === 'WITHDRAW' ? '1' : '0',
          predecessorWithdrawalFactId: null,
          contractVersion: 1,
        })),
        contribution: {
          producer: 'dss.api.reputation',
          factId: view.contributionFactId,
        },
      },
    } as const;
  }
}

// The adapter checks the boarding pass. It does not award frequent-flyer miles. 🛰️
