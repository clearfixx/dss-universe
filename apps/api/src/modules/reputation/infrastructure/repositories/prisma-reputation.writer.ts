/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Persistence
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation.writer.ts
 *
 * 🎯 Purpose:
 * Preserves owned ledger locks, appends and evidence inside root-supplied transactions.
 *
 * 🧠 Responsibilities:
 * • enforces the same rolling-pair and original-entry advisory lock decisions;
 * • appends direct/compensating facts and audit/outbox atomically;
 * • appends owned qualification provenance after evidence in that same transaction;
 * • requests response composition at the former relation-read point before evidence.
 *
 * 🏗️ Architecture:
 * Stateless guarded technical writer; no Users SQL, profile policy or transaction lifetime.
 *
 * ⚠️ Important:
 * Projection callbacks stay infrastructure-only; provider failures must abort all writes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import type { TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type {
  CreateReputationEntry,
  ReputationEntry,
  ReputationValue,
} from '../../domain/types/reputation.type';
import type { ReputationEntryFact } from './prisma-reputation-entry.reader';
import {
  PrismaReputationQualificationWriter,
  type ReputationOriginalEvidenceLookup,
} from './prisma-reputation-qualification.writer';

export type ReputationEntryProjection = (
  entry: ReputationEntryFact,
) => Promise<ReputationEntry>;
const DIRECT_EVENT = 'reputation.direct.changed.v1';
const REVERSED_EVENT = 'reputation.direct.reversed.v1';
const entrySelect = {
  id: true,
  actorId: true,
  recipientId: true,
  value: true,
  reason: true,
  createdAt: true,
} as const;

@Injectable()
export class PrismaReputationWriter {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    private readonly qualifications: PrismaReputationQualificationWriter,
  ) {}

  async createDirect(
    transaction: TransactionClient,
    input: CreateReputationEntry,
    project: ReputationEntryProjection,
  ): Promise<ReputationEntry | null> {
    await this.lock(
      transaction,
      `reputation:${input.actorId}:${input.recipientId}`,
    );
    const recent = await transaction.reputationEntry.findFirst({
      where: {
        actorId: input.actorId,
        recipientId: input.recipientId,
        reversesEntryId: null,
        createdAt: { gt: input.cooldownStartedAfter },
      },
      select: { id: true },
    });
    if (recent) return null;
    const entry = await transaction.reputationEntry.create({
      data: {
        actorId: input.actorId,
        recipientId: input.recipientId,
        value: input.value,
        reason: input.reason,
      },
      select: entrySelect,
    });
    const response = await project(entry);
    const event = await this.appendEvidence(
      transaction,
      entry.id,
      input.actorId,
      input.recipientId,
      input.value,
      input.reason,
      DIRECT_EVENT,
    );
    await this.qualifications.direct(transaction, {
      entryId: entry.id,
      actorId: input.actorId,
      recipientId: input.recipientId,
      value: input.value,
      eventId: event.id,
      occurredAt: event.occurredAt,
    });
    return response;
  }

  async reverse(
    transaction: TransactionClient,
    entryId: string,
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
    project: ReputationEntryProjection,
    lookupOriginalEvidence: ReputationOriginalEvidenceLookup,
  ): Promise<ReputationEntry | null> {
    await this.lock(transaction, `reputation-reversal:${entryId}`);
    const exists = await transaction.reputationEntry.findUnique({
      where: { reversesEntryId: entryId },
      select: { id: true },
    });
    if (exists) return null;
    const entry = await transaction.reputationEntry.create({
      data: { actorId, recipientId, value, reason, reversesEntryId: entryId },
      select: entrySelect,
    });
    const response = await project(entry);
    const event = await this.appendEvidence(
      transaction,
      entry.id,
      actorId,
      recipientId,
      value,
      reason,
      REVERSED_EVENT,
      entryId,
    );
    await this.qualifications.reverse(
      transaction,
      {
        entryId: entry.id,
        actorId,
        recipientId,
        value,
        eventId: event.id,
        occurredAt: event.occurredAt,
      },
      entryId,
      lookupOriginalEvidence,
    );
    return response;
  }

  private lock(
    transaction: TransactionClient,
    coordinate: string,
  ): Promise<number> {
    return transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))
    `;
  }

  private async appendEvidence(
    transaction: TransactionClient,
    entryId: string,
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
    eventName: string,
    reversesEntryId?: string,
  ) {
    const evidence = {
      recipientId,
      value,
      ...(reversesEntryId ? { reversesEntryId } : {}),
    };
    await this.audit.append(transaction, {
      action:
        eventName === DIRECT_EVENT
          ? 'reputation.direct.changed'
          : 'reputation.direct.reversed',
      actorType: 'USER',
      actorId,
      targetType: 'ReputationEntry',
      targetId: entryId,
      reason,
      metadata: evidence,
    });
    const event = createEventEnvelope({
      name: eventName,
      version: 1,
      category: 'integration',
      producer: 'dss.api.reputation',
      actorId,
      aggregate: { type: 'ReputationEntry', id: entryId },
      payload: evidence,
    });
    await this.outbox.append(transaction, event);
    return event;
  }
}

/**
 * Corrections add coordinates. The ledger still has no eraser. 🛰️
 */
