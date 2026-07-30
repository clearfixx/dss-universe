/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/reaction.type.ts
 *
 * 🎯 Purpose:
 * Defines shared reaction records, kinds, commands and aggregate projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const REACTION_KINDS = ['LIKE', 'UPVOTE', 'DOWNVOTE'] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];

export type Reaction = {
  id: string;
  interactionTargetId: string;
  actorId: string;
  kind: ReactionKind;
  createdAt: Date;
  updatedAt: Date;
};

export type ReactionAggregate = {
  interactionTargetId: string;
  likes: number;
  upvotes: number;
  downvotes: number;
  score: number;
  total: number;
  updatedAt: Date | null;
};

export type ReactionSummary = ReactionAggregate & {
  viewerReaction: ReactionKind | null;
};

export type SetReactionResult = {
  reaction: Reaction;
  aggregate: ReactionAggregate;
  changed: boolean;
};

export type ClearReactionResult = {
  removed: boolean;
  aggregate: ReactionAggregate;
};

/**
 * An aggregate is a fast map. The reaction rows remain the territory.
 */
