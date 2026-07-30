/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-reactions.repository.ts
 *
 * 🎯 Purpose:
 * Persists idempotent reactions, aggregate projections and event evidence.
 *
 * 🧠 Responsibilities:
 * • serializes target reaction changes with a database advisory lock;
 * • stores one reaction per actor and target;
 * • rebuilds aggregate values from canonical reaction rows;
 * • records Audit and Outbox evidence only for real state transitions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type { ReactionsRepository } from '../../domain/repositories/reactions.repository.interface';
import type {
  ClearReactionResult,
  Reaction,
  ReactionAggregate,
  ReactionKind,
  ReactionSummary,
  SetReactionResult,
} from '../../domain/types/reaction.type';

const PRODUCER = 'dss.api.reactions';

@Injectable()
export class PrismaReactionsRepository implements ReactionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async set(
    interactionTargetId: string,
    actorId: string,
    kind: ReactionKind,
  ): Promise<SetReactionResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockTarget(transaction, interactionTargetId);
      const current = await transaction.reaction.findUnique({
        where: {
          interactionTargetId_actorId: { interactionTargetId, actorId },
        },
      });

      if (current?.kind === kind) {
        return {
          reaction: current,
          aggregate: await this.rebuildAggregate(
            transaction,
            interactionTargetId,
          ),
          changed: false,
        };
      }

      const reaction = await transaction.reaction.upsert({
        where: {
          interactionTargetId_actorId: { interactionTargetId, actorId },
        },
        create: { interactionTargetId, actorId, kind },
        update: { kind },
      });
      const aggregate = await this.rebuildAggregate(
        transaction,
        interactionTargetId,
      );
      await this.record(
        transaction,
        reaction,
        current?.kind ?? null,
        kind,
        current ? 'changed' : 'set',
      );
      return { reaction, aggregate, changed: true };
    });
  }

  async clear(
    interactionTargetId: string,
    actorId: string,
  ): Promise<ClearReactionResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockTarget(transaction, interactionTargetId);
      const current = await transaction.reaction.findUnique({
        where: {
          interactionTargetId_actorId: { interactionTargetId, actorId },
        },
      });
      if (!current) {
        return {
          removed: false,
          aggregate: await this.rebuildAggregate(
            transaction,
            interactionTargetId,
          ),
        };
      }

      await transaction.reaction.delete({ where: { id: current.id } });
      const aggregate = await this.rebuildAggregate(
        transaction,
        interactionTargetId,
      );
      await this.record(transaction, current, current.kind, null, 'cleared');
      return { removed: true, aggregate };
    });
  }

  async summary(
    interactionTargetId: string,
    viewerId: string,
  ): Promise<ReactionSummary> {
    const [aggregate, reaction] = await this.prisma.$transaction([
      this.prisma.reactionAggregate.findUnique({
        where: { interactionTargetId },
      }),
      this.prisma.reaction.findUnique({
        where: {
          interactionTargetId_actorId: {
            interactionTargetId,
            actorId: viewerId,
          },
        },
      }),
    ]);
    return {
      ...(aggregate ?? this.emptyAggregate(interactionTargetId)),
      viewerReaction: reaction?.kind ?? null,
    };
  }

  private async lockTarget(
    transaction: Parameters<AuditWriterService['append']>[0],
    targetId: string,
  ): Promise<void> {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${targetId}))
    `;
  }

  private async rebuildAggregate(
    transaction: Parameters<AuditWriterService['append']>[0],
    targetId: string,
  ): Promise<ReactionAggregate> {
    const groups = await transaction.reaction.groupBy({
      by: ['kind'],
      where: { interactionTargetId: targetId },
      _count: { _all: true },
    });
    const count = (kind: ReactionKind) =>
      groups.find((group) => group.kind === kind)?._count._all ?? 0;
    const likes = count('LIKE');
    const upvotes = count('UPVOTE');
    const downvotes = count('DOWNVOTE');
    return transaction.reactionAggregate.upsert({
      where: { interactionTargetId: targetId },
      create: {
        interactionTargetId: targetId,
        likes,
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        total: likes + upvotes + downvotes,
      },
      update: {
        likes,
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        total: likes + upvotes + downvotes,
      },
    });
  }

  private async record(
    transaction: Parameters<AuditWriterService['append']>[0],
    reaction: Reaction,
    previousKind: ReactionKind | null,
    kind: ReactionKind | null,
    action: 'set' | 'changed' | 'cleared',
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `reactions.reaction.${action}`,
      actorType: 'USER',
      actorId: reaction.actorId,
      targetType: 'InteractionTarget',
      targetId: reaction.interactionTargetId,
      metadata: {
        reactionId: reaction.id,
        previousKind,
        kind,
      },
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `reactions.reaction.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId: reaction.actorId,
        aggregate: {
          type: 'InteractionTarget',
          id: reaction.interactionTargetId,
        },
        payload: {
          reactionId: reaction.id,
          interactionTargetId: reaction.interactionTargetId,
          actorId: reaction.actorId,
          previousKind,
          kind,
        },
      }),
    );
  }

  private emptyAggregate(interactionTargetId: string): ReactionAggregate {
    return {
      interactionTargetId,
      likes: 0,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      total: 0,
      updatedAt: null,
    };
  }
}

/**
 * Projection drift has one cure: rebuild from the source of truth.
 */
