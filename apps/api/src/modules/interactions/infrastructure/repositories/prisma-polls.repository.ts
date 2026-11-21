/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-polls.repository.ts
 *
 * 🎯 Purpose:
 * Persists polls, options and immutable ballots with audit and Outbox evidence.
 *
 * ⚠️ Important:
 * The ballot primary key (poll, voter) makes a second vote impossible even under
 * concurrent requests; the database rejects any later change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type {
  PollDefinition,
  PollsRepository,
} from '../../domain/repositories/polls.repository.interface';
import type {
  CreatePoll,
  PollResult,
  PollVoterPage,
} from '../../domain/types/poll.type';

const PRODUCER = 'dss.api.polls';
const MAX_VOTER_PAGE = 100;

@Injectable()
export class PrismaPollsRepository implements PollsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async create(command: CreatePoll): Promise<{ pollId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const pollId = randomUUID();
      await tx.poll.create({
        data: {
          id: pollId,
          interactionTargetId: command.interactionTargetId,
          question: command.question,
          visibility: command.visibility,
          maxChoices: command.maxChoices,
          createdById: command.createdById,
          options: {
            create: command.options.map((label, position) => ({
              id: randomUUID(),
              position,
              label,
            })),
          },
        },
      });
      await this.record(tx, command.createdById, pollId, 'created', {
        interactionTargetId: command.interactionTargetId,
        visibility: command.visibility,
        optionCount: command.options.length,
        maxChoices: command.maxChoices,
      });
      return { pollId };
    });
  }

  async findDefinition(pollId: string): Promise<PollDefinition | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        interactionTargetId: true,
        visibility: true,
        maxChoices: true,
        options: { select: { id: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!poll) return null;
    return {
      id: poll.id,
      interactionTargetId: poll.interactionTargetId,
      visibility: poll.visibility,
      maxChoices: poll.maxChoices,
      optionIds: poll.options.map(({ id }) => id),
    };
  }

  async findByTarget(
    interactionTargetId: string,
    viewerId: string | null,
  ): Promise<PollResult | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { interactionTargetId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    if (!poll) return null;
    const [counts, totalBallots, viewerChoices] = await Promise.all([
      this.prisma.pollBallotChoice.groupBy({
        by: ['optionId'],
        where: { pollId: poll.id },
        _count: { _all: true },
      }),
      this.prisma.pollBallot.count({ where: { pollId: poll.id } }),
      viewerId
        ? this.prisma.pollBallotChoice.findMany({
            where: { pollId: poll.id, voterId: viewerId },
            select: { optionId: true },
          })
        : Promise.resolve(null),
    ]);
    const byOption = new Map(
      counts.map((row) => [row.optionId, row._count._all]),
    );
    return {
      id: poll.id,
      interactionTargetId: poll.interactionTargetId,
      question: poll.question,
      visibility: poll.visibility,
      maxChoices: poll.maxChoices,
      totalBallots,
      options: poll.options.map((option) => ({
        id: option.id,
        position: option.position,
        label: option.label,
        voteCount: byOption.get(option.id) ?? 0,
      })),
      viewerChoiceIds:
        viewerChoices === null
          ? null
          : viewerChoices.map(({ optionId }) => optionId),
      createdAt: poll.createdAt,
    };
  }

  async castBallot(
    poll: PollDefinition,
    voterId: string,
    optionIds: string[],
  ): Promise<'CAST' | 'ALREADY_VOTED'> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.pollBallot.create({
          data: {
            pollId: poll.id,
            voterId,
            choices: {
              create: optionIds.map((optionId) => ({ optionId })),
            },
          },
        });
        await this.record(tx, voterId, poll.id, 'ballot.cast', {
          interactionTargetId: poll.interactionTargetId,
          choiceCount: optionIds.length,
          // Anonymous ballots keep option choices out of shared evidence.
          ...(poll.visibility === 'OPEN' ? { optionIds } : {}),
        });
      });
      return 'CAST';
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'ALREADY_VOTED';
      }
      throw error;
    }
  }

  async voters(
    pollId: string,
    optionId: string,
    page: number,
    limit: number,
  ): Promise<PollVoterPage> {
    const safePage = Math.max(1, Math.trunc(page) || 1);
    const safeLimit = Math.min(
      MAX_VOTER_PAGE,
      Math.max(1, Math.trunc(limit) || 20),
    );
    const where = { pollId, optionId };
    const [rows, total] = await Promise.all([
      this.prisma.pollBallotChoice.findMany({
        where,
        select: { voterId: true, ballot: { select: { castAt: true } } },
        orderBy: [{ ballot: { castAt: 'asc' } }, { voterId: 'asc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.pollBallotChoice.count({ where }),
    ]);
    return {
      voterIds: rows.map(({ voterId }) => voterId),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    pollId: string,
    action: 'created' | 'ballot.cast',
    metadata: Record<string, string | number | string[]>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'polls.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType: 'Poll',
      targetId: pollId,
      metadata,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: 'polls.' + action + '.v1',
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'Poll', id: pollId },
        payload: { pollId, ...metadata },
      }),
    );
  }
}
