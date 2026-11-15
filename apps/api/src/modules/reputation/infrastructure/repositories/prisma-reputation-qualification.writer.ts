/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Persistence
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/prisma-reputation-qualification.writer.ts
 * 🎯 Purpose: Appends producer provenance within the existing guarded ledger transaction.
 * 🧠 Responsibilities: Keeps native facts, verified predecessor adoption and blocked history explicit.
 * 🏗️ Architecture: Owned technical writer; canonical legacy lookup is supplied by root composition.
 * ⚠️ Important: Never invokes a consumer, publishes a job or repairs immutable history.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TransactionClient } from '@api/core/database';

export type ReputationOriginalEvidenceInput = {
  entryId: string;
  actorId: string;
  recipientId: string;
  value: -1 | 1;
};
export type ReputationOriginalEvidenceLookup = (
  input: ReputationOriginalEvidenceInput,
) => Promise<
  | { status: 'VERIFIED'; eventId: string; occurredAt: string }
  | { status: 'BLOCKED' }
>;
export type ReputationWriteEvidence = ReputationOriginalEvidenceInput & {
  eventId: string;
  occurredAt: string;
};

@Injectable()
export class PrismaReputationQualificationWriter {
  async direct(
    transaction: TransactionClient,
    evidence: ReputationWriteEvidence,
    provenance: 'NATIVE' | 'VERIFIED_LEGACY' = 'NATIVE',
  ) {
    const binding = await transaction.reputationQualificationEvent.create({
      data: {
        ...evidence,
        occurredAt: new Date(evidence.occurredAt),
        kind: 'DIRECT',
        provenance,
      },
    });
    const factId = randomUUID();
    await transaction.reputationQualificationFact.create({
      data: {
        id: factId,
        eventBindingId: binding.id,
        scope: 'ENTRY',
        scopeEntryId: evidence.entryId,
        revision: 1n,
        action: 'QUALIFY',
        qualificationFactId: factId,
      },
    });
    return transaction.reputationQualificationState.create({
      data: {
        originalEntryId: evidence.entryId,
        status: 'ACTIVE',
        revision: 1n,
        qualificationFactId: factId,
        currentFactId: factId,
      },
    });
  }

  async reverse(
    transaction: TransactionClient,
    evidence: ReputationWriteEvidence,
    originalEntryId: string,
    lookup: ReputationOriginalEvidenceLookup,
  ) {
    const original = await transaction.reputationEntry.findUniqueOrThrow({
      where: { id: originalEntryId },
      select: {
        id: true,
        actorId: true,
        recipientId: true,
        value: true,
        reversesEntryId: true,
      },
    });
    if (
      original.reversesEntryId !== null ||
      (original.value !== 1 && original.value !== -1)
    )
      throw new Error('Invalid original Reputation evidence.');
    let state = await transaction.reputationQualificationState.findUnique({
      where: { originalEntryId },
    });
    if (!state) {
      const predecessor = await lookup({
        entryId: original.id,
        actorId: original.actorId,
        recipientId: original.recipientId,
        value: original.value,
      });
      if (predecessor.status === 'VERIFIED')
        state = await this.direct(
          transaction,
          {
            entryId: original.id,
            actorId: original.actorId,
            recipientId: original.recipientId,
            value: original.value,
            eventId: predecessor.eventId,
            occurredAt: predecessor.occurredAt,
          },
          'VERIFIED_LEGACY',
        );
    }
    if (state && (state.status !== 'ACTIVE' || !state.qualificationFactId))
      throw new Error('Conflicting Reputation lifecycle evidence.');
    const binding = await transaction.reputationQualificationEvent.create({
      data: {
        ...evidence,
        occurredAt: new Date(evidence.occurredAt),
        kind: 'REVERSAL',
        originalEntryId,
        provenance: state ? 'NATIVE' : 'BLOCKED_LEGACY',
      },
    });
    const eventFactId = randomUUID();
    await transaction.reputationQualificationFact.create({
      data: {
        id: eventFactId,
        eventBindingId: binding.id,
        scope: 'EVENT',
        revision: 1n,
        action: 'QUALIFY',
        qualificationFactId: eventFactId,
      },
    });
    if (!state) {
      await transaction.reputationQualificationState.create({
        data: {
          originalEntryId,
          status: 'BLOCKED_LEGACY',
        },
      });
      return;
    }
    const withdrawalId = randomUUID();
    await transaction.reputationQualificationFact.create({
      data: {
        id: withdrawalId,
        eventBindingId: binding.id,
        scope: 'ENTRY',
        scopeEntryId: originalEntryId,
        revision: 2n,
        action: 'WITHDRAW',
        qualificationFactId: state.qualificationFactId!,
      },
    });
    await transaction.reputationQualificationState.update({
      where: { originalEntryId },
      data: { status: 'WITHDRAWN', revision: 2n, currentFactId: withdrawalId },
    });
  }
}
