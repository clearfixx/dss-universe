/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/reactions.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for shared reactions and aggregates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  ClearReactionResult,
  ReactionKind,
  ReactionSummary,
  SetReactionResult,
} from '../types/reaction.type';

export const REACTIONS_REPOSITORY = Symbol('REACTIONS_REPOSITORY');

export interface ReactionsRepository {
  set(
    interactionTargetId: string,
    actorId: string,
    kind: ReactionKind,
  ): Promise<SetReactionResult>;
  clear(
    interactionTargetId: string,
    actorId: string,
  ): Promise<ClearReactionResult>;
  summary(
    interactionTargetId: string,
    viewerId: string,
  ): Promise<ReactionSummary>;
}

/**
 * Idempotency belongs in persistence too; retries should be boring.
 */
