/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/polls.repository.interface.ts
 *
 * 🎯 Purpose:
 * Persistence port for shared polls and immutable ballots.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  CreatePoll,
  PollResult,
  PollVisibility,
  PollVoterPage,
} from '../types/poll.type';

export const POLLS_REPOSITORY = Symbol('POLLS_REPOSITORY');

export type PollDefinition = {
  id: string;
  interactionTargetId: string;
  visibility: PollVisibility;
  maxChoices: number;
  optionIds: string[];
};

export interface PollsRepository {
  create(command: CreatePoll): Promise<{ pollId: string }>;
  findDefinition(pollId: string): Promise<PollDefinition | null>;
  findByTarget(
    interactionTargetId: string,
    viewerId: string | null,
  ): Promise<PollResult | null>;
  castBallot(
    poll: PollDefinition,
    voterId: string,
    optionIds: string[],
  ): Promise<'CAST' | 'ALREADY_VOTED'>;
  voters(
    pollId: string,
    optionId: string,
    page: number,
    limit: number,
  ): Promise<PollVoterPage>;
}
