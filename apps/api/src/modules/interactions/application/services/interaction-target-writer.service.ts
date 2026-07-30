/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/interaction-target-writer.service.ts
 *
 * 🎯 Purpose:
 * Registers and transitions interaction targets inside owner transactions.
 *
 * 🧠 Responsibilities:
 * • creates immutable canonical identities;
 * • permits lifecycle transitions without rewriting ownership;
 * • appends Audit and Outbox evidence beside each state change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConflictException, Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import type { TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type {
  InteractionTarget,
  InteractionTargetStatus,
  RegisterInteractionTarget,
} from '../../domain/types/interaction-target.type';

const PRODUCER = 'dss.api.interactions';

@Injectable()
export class InteractionTargetWriterService {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async register(
    transaction: TransactionClient,
    input: RegisterInteractionTarget,
  ): Promise<InteractionTarget> {
    const existing = await transaction.interactionTarget.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
        },
      },
    });
    if (existing) {
      if (
        existing.id !== input.id ||
        existing.kind !== input.kind ||
        existing.ownerModule !== input.ownerModule
      ) {
        throw new ConflictException('Interaction target ownership conflicts.');
      }
      return existing;
    }
    const target = await transaction.interactionTarget.create({
      data: {
        id: input.id,
        kind: input.kind,
        ownerModule: input.ownerModule,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
      },
    });
    await this.record(transaction, target, input.actorId, 'registered', null);
    return target;
  }

  async setStatus(
    transaction: TransactionClient,
    targetId: string,
    status: InteractionTargetStatus,
    actorId?: string,
    reason?: string,
  ): Promise<InteractionTarget> {
    const current = await transaction.interactionTarget.findUniqueOrThrow({
      where: { id: targetId },
    });
    if (current.status === status) return current;
    const target = await transaction.interactionTarget.update({
      where: { id: targetId },
      data: { status },
    });
    await this.record(
      transaction,
      target,
      actorId,
      'status-changed',
      reason ?? null,
    );
    return target;
  }

  private async record(
    transaction: TransactionClient,
    target: InteractionTarget,
    actorId: string | undefined,
    action: 'registered' | 'status-changed',
    reason: string | null,
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `interactions.target.${action.replace('-', '_')}`,
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
      targetType: 'InteractionTarget',
      targetId: target.id,
      reason: reason ?? undefined,
      metadata: {
        kind: target.kind,
        ownerModule: target.ownerModule,
        ownerType: target.ownerType,
        ownerId: target.ownerId,
        status: target.status,
      },
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `interactions.target.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'InteractionTarget', id: target.id },
        payload: {
          targetId: target.id,
          kind: target.kind,
          ownerModule: target.ownerModule,
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          status: target.status,
          reason,
        },
      }),
    );
  }
}

/**
 * The owner creates the coordinate; shared features merely meet there.
 */
