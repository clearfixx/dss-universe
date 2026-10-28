/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository.ts
 * 🎯 Purpose: Persists once-only activation and audited optimistic operator transitions.
 * 🧠 Responsibilities: Keeps cutoff immutable and preparation explicitly invoked.
 * 🏗️ Architecture: Root-owned technical transaction adapter.
 * ⚠️ Important: Trusted operational authorization/preflight belongs to package D.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type {
  ActivationView,
  RoutingControl,
  RoutingOperator,
} from '../contracts/routing.types';
import { GAMIFICATION_DESTINATION } from '../contracts/routing.constants';
import {
  assertIdentity,
  assertOperator,
  assertRevision,
} from '../contracts/routing-validation';

@Injectable()
export class PrismaRoutingControlRepository implements RoutingControl {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}
  async prepare(operator: RoutingOperator): Promise<ActivationView> {
    assertOperator(operator);
    return this.prisma.$transaction(async (tx) => {
      // Let the database supply UTC wall-clock defaults, including updatedAt.
      const inserted = await tx.$executeRaw`
        INSERT INTO gamification_activations (destination,"changedBy")
        VALUES (${GAMIFICATION_DESTINATION},${operator.actorId}) ON CONFLICT DO NOTHING`;
      if (inserted) {
        await tx.$executeRaw`INSERT INTO gamification_discovery (destination) VALUES (${GAMIFICATION_DESTINATION})`;
        await this.appendAudit(tx, 'prepared', operator, 0n);
      }
      return tx.gamificationActivation.findUniqueOrThrow({
        where: { destination: GAMIFICATION_DESTINATION },
        select: { state: true, cutoff: true, revision: true },
      });
    });
  }
  async activate(
    operator: RoutingOperator,
    revision: bigint,
    preflightId: string,
  ): Promise<ActivationView> {
    assertOperator(operator);
    assertRevision(revision);
    assertIdentity(preflightId);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, revision);
      if (current.state !== 'PREPARED') throw new Error('ALREADY_ACTIVATED');
      const [result] = await tx.$queryRaw<ActivationView[]>`
        UPDATE gamification_activations SET state='ACTIVE',
          cutoff=timezone('UTC',clock_timestamp()), "activatedBy"=${operator.actorId},
          "changedBy"=${operator.actorId}, revision=revision+1,
          "updatedAt"=timezone('UTC',clock_timestamp())
        WHERE destination=${GAMIFICATION_DESTINATION} RETURNING state, cutoff, revision`;
      await this.appendAudit(
        tx,
        'activated',
        operator,
        result.revision,
        preflightId,
      );
      return result;
    });
  }
  async setPaused(
    paused: boolean,
    operator: RoutingOperator,
    revision: bigint,
  ): Promise<ActivationView> {
    assertOperator(operator);
    assertRevision(revision);
    if (typeof paused !== 'boolean') throw new TypeError('Invalid pause state');
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, revision);
      if (current.state === 'PREPARED') throw new Error('NOT_READY');
      const state = paused ? 'PAUSED' : 'ACTIVE';
      if (current.state === state) return current;
      const [result] = await tx.$queryRaw<ActivationView[]>`
        UPDATE gamification_activations SET state=${state}::"GamificationActivationState",
          "changedBy"=${operator.actorId}, revision=revision+1,
          "updatedAt"=timezone('UTC',clock_timestamp())
        WHERE destination=${GAMIFICATION_DESTINATION} RETURNING state, cutoff, revision`;
      await this.appendAudit(
        tx,
        paused ? 'paused' : 'resumed',
        operator,
        result.revision,
      );
      return result;
    });
  }
  private async lock(
    tx: TransactionClient,
    revision: bigint,
  ): Promise<ActivationView> {
    const rows = await tx.$queryRaw<ActivationView[]>`
      SELECT state,cutoff,revision FROM gamification_activations
      WHERE destination=${GAMIFICATION_DESTINATION} FOR UPDATE`;
    const current = rows[0];
    if (!current) throw new Error('NOT_PREPARED');
    if (current.revision !== revision) throw new Error('STALE_REVISION');
    return current;
  }
  private async appendAudit(
    tx: TransactionClient,
    action: string,
    operator: RoutingOperator,
    revision: bigint,
    preflightId?: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: `gamification.activation.${action}`,
      actorId: operator.actorId,
      actorType: operator.actorType,
      targetType: 'GamificationActivation',
      targetId: GAMIFICATION_DESTINATION,
      metadata: {
        revision: revision.toString(),
        ...(preflightId ? { preflightId } : {}),
      },
    });
  }
}
