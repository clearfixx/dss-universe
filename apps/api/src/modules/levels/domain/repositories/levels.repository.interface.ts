/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/domain/repositories/levels.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for definitions and append-only transitions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  LevelDefinition,
  LevelEvent,
  LevelSyncResult,
  LevelTransitionHistory,
} from '../types/levels.type';

export const LEVELS_REPOSITORY = Symbol('LEVELS_REPOSITORY');

export interface LevelsRepository {
  definitions(): Promise<LevelDefinition[]>;
  updateDefinition(
    level: number,
    threshold: number,
    updatedById: string,
  ): Promise<LevelDefinition | null>;
  sync(
    event: LevelEvent,
    targetLevel: number,
    balance: number,
  ): Promise<LevelSyncResult>;
  history(
    userId: string,
    page: number,
    limit: number,
  ): Promise<LevelTransitionHistory>;
}

/**
 * Definition updates are allowed. Transition rewrites are deliberately absent.
 */
