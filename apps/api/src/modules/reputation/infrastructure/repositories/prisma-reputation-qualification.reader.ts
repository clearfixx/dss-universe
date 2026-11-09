/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Persistence
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation-qualification.reader.ts
 * 🎯 Purpose: Projects at most three owned facts for canonical root attestation.
 * 🧠 Responsibilities: Includes current withdrawal and explicit event contribution without foreign reads.
 * 🏗️ Architecture: Transaction-bound technical adapter returning owner data only.
 * ⚠️ Important: Unknown or inconsistent persisted evidence never becomes an empty success.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { ReputationQualificationEvent as StoredEvent } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import type {
  ReputationQualificationEvent,
  ReputationQualificationView,
  ReputationProducerFact,
} from '../../domain/types/reputation-qualification.type';
import { reputationQualificationWindow } from './reputation-qualification-window.sql';

type FactRow = StoredEvent & {
  factId: string;
  factScope: string;
  factRevision: bigint;
  factAction: string;
  qualificationFactId: string;
  factVersion: number;
  qualificationEventId: string;
};

function project(row: StoredEvent): ReputationQualificationEvent {
  if (
    (row.kind !== 'DIRECT' && row.kind !== 'REVERSAL') ||
    !['NATIVE', 'VERIFIED_LEGACY', 'BLOCKED_LEGACY'].includes(row.provenance) ||
    (row.value !== -1 && row.value !== 1) ||
    row.contractVersion !== 1
  )
    throw new Error('Invalid stored Reputation qualification event.');
  return {
    eventId: row.eventId,
    entryId: row.entryId,
    kind: row.kind,
    actorId: row.actorId,
    recipientId: row.recipientId,
    value: row.value,
    originalEntryId: row.originalEntryId,
    occurredAt: row.occurredAt.toISOString(),
    provenance: row.provenance as ReputationQualificationEvent['provenance'],
    contractVersion: 1,
  };
}

@Injectable()
export class PrismaReputationQualificationReader {
  async read(
    transaction: TransactionClient,
    eventId: string,
  ): Promise<ReputationQualificationView | null> {
    const binding = await transaction.reputationQualificationEvent.findUnique({
      where: { eventId },
    });
    if (!binding) return null;
    const event = project(binding);
    const originalEntryId =
      event.kind === 'DIRECT' ? event.entryId : event.originalEntryId;
    if (!originalEntryId)
      throw new Error('Missing Reputation original coordinate.');
    const state = await transaction.reputationQualificationState.findUnique({
      where: { originalEntryId },
    });
    const rows = await transaction.$queryRaw<FactRow[]>(
      reputationQualificationWindow(originalEntryId, binding.id),
    );
    if (rows.length > 3)
      throw new Error('Oversized Reputation qualification view.');
    const facts = rows.map<ReputationProducerFact>((row) => {
      if (
        (row.factScope !== 'ENTRY' && row.factScope !== 'EVENT') ||
        (row.factAction !== 'QUALIFY' && row.factAction !== 'WITHDRAW') ||
        (row.factRevision !== 1n && row.factRevision !== 2n) ||
        row.factVersion !== 1
      )
        throw new Error('Invalid stored Reputation qualification fact.');
      return {
        evidence: project(row),
        factId: row.factId,
        eventId: row.eventId,
        scope: row.factScope,
        sourceId: row.factScope === 'ENTRY' ? originalEntryId : row.eventId,
        revision: row.factRevision === 1n ? '1' : '2',
        action: row.factAction,
        qualification: {
          factId: row.qualificationFactId,
          eventId: row.qualificationEventId,
        },
        contractVersion: 1,
      };
    });
    const contribution = facts.find((fact) =>
      event.kind === 'DIRECT'
        ? fact.scope === 'ENTRY' && fact.revision === '1'
        : fact.scope === 'EVENT' && fact.eventId === event.eventId,
    );
    return {
      event,
      facts,
      contributionFactId: contribution?.factId ?? '',
      blocked: !state || state.status === 'BLOCKED_LEGACY' || !contribution,
    };
  }
}
