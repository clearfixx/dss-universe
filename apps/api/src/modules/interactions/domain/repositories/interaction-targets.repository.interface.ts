/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/interaction-targets.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the read boundary for canonical interaction targets.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { InteractionTarget } from '../types/interaction-target.type';

export const INTERACTION_TARGETS_REPOSITORY = Symbol(
  'INTERACTION_TARGETS_REPOSITORY',
);

export interface InteractionTargetsRepository {
  findById(id: string): Promise<InteractionTarget | null>;
}

/**
 * Registration uses the transactional writer; reads stay repository-shaped.
 */
