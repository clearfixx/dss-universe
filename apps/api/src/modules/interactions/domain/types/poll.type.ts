/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/poll.type.ts
 *
 * 🎯 Purpose:
 * Defines the shared Polls vocabulary attached to Interaction Targets.
 *
 * ⚠️ Important:
 * A ballot is cast once and never changed; anonymous polls never expose voters.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const POLL_VISIBILITIES = ['OPEN', 'ANONYMOUS'] as const;
export type PollVisibility = (typeof POLL_VISIBILITIES)[number];

export type CreatePoll = {
  interactionTargetId: string;
  createdById: string;
  question: string;
  options: string[];
  visibility: PollVisibility;
  maxChoices: number;
};

export type PollOptionResult = {
  id: string;
  position: number;
  label: string;
  voteCount: number;
};

export type PollResult = {
  id: string;
  interactionTargetId: string;
  question: string;
  visibility: PollVisibility;
  maxChoices: number;
  totalBallots: number;
  options: PollOptionResult[];
  viewerChoiceIds: string[] | null;
  createdAt: Date;
};

export type PollVoterPage = {
  voterIds: string[];
  total: number;
  page: number;
  limit: number;
};
