/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/polls.service.ts
 *
 * 🎯 Purpose:
 * Coordinates shared polls: owner-created definitions, one-time ballots and
 * viewer-safe results.
 *
 * 🧠 Responsibilities:
 * • validates definitions and ballots;
 * • asks the target owner for READ and REACT (voting) decisions;
 * • never reveals voters of anonymous polls.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PollCommands } from '../../contracts/poll-commands.contract';
import {
  normalizeBallot,
  normalizePollDefinition,
} from '../../domain/poll.rules';
import {
  POLLS_REPOSITORY,
  type PollsRepository,
} from '../../domain/repositories/polls.repository.interface';
import type { InteractionViewer } from '../../domain/types/interaction-viewer.type';
import type {
  CreatePoll,
  PollResult,
  PollVoterPage,
} from '../../domain/types/poll.type';
import { InteractionTargetsService } from './interaction-targets.service';

@Injectable()
export class PollsService implements PollCommands {
  constructor(
    @Inject(POLLS_REPOSITORY)
    private readonly polls: PollsRepository,
    private readonly targets: InteractionTargetsService,
  ) {}

  async createPoll(command: CreatePoll): Promise<{ pollId: string }> {
    const definition = normalizePollDefinition(command);
    await this.targets.getById(definition.interactionTargetId);
    return this.polls.create(definition);
  }

  async forTarget(
    viewer: InteractionViewer,
    interactionTargetId: string,
  ): Promise<PollResult | null> {
    await this.assertAccess(interactionTargetId, viewer, 'READ');
    return this.polls.findByTarget(
      interactionTargetId,
      viewer.kind === 'AUTHENTICATED' ? viewer.subjectId : null,
    );
  }

  async castBallot(
    voterId: string,
    pollId: string,
    optionIds: readonly string[],
  ): Promise<PollResult> {
    const poll = await this.polls.findDefinition(pollId);
    if (!poll) throw new NotFoundException('Poll was not found.');
    const viewer = { kind: 'AUTHENTICATED', subjectId: voterId } as const;
    await this.assertAccess(poll.interactionTargetId, viewer, 'REACT');
    const choices = normalizeBallot(
      optionIds,
      new Set(poll.optionIds),
      poll.maxChoices,
    );
    if (
      (await this.polls.castBallot(poll, voterId, choices)) === 'ALREADY_VOTED'
    ) {
      throw new ConflictException('You have already voted in this poll.');
    }
    const result = await this.polls.findByTarget(
      poll.interactionTargetId,
      voterId,
    );
    if (!result) throw new NotFoundException('Poll was not found.');
    return result;
  }

  async voters(
    viewer: InteractionViewer,
    pollId: string,
    optionId: string,
    page: number,
    limit: number,
  ): Promise<PollVoterPage> {
    const poll = await this.polls.findDefinition(pollId);
    if (!poll || !poll.optionIds.includes(optionId)) {
      throw new NotFoundException('Poll option was not found.');
    }
    await this.assertAccess(poll.interactionTargetId, viewer, 'READ');
    if (poll.visibility === 'ANONYMOUS') {
      throw new ForbiddenException('Voters of an anonymous poll are private.');
    }
    return this.polls.voters(pollId, optionId, page, limit);
  }

  private async assertAccess(
    targetId: string,
    viewer: InteractionViewer,
    capability: 'READ' | 'REACT',
  ): Promise<void> {
    const decision = await this.targets.authorize(targetId, viewer, capability);
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Interaction target denied ${capability === 'REACT' ? 'voting' : 'read'}: ${
          decision.reason ?? 'POLICY_DENIED'
        }.`,
      );
    }
  }
}

/** One voter, one ballot, one moment. Regret is not a GraphQL mutation. */
