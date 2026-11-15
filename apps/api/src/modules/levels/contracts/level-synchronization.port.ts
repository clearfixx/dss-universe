/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/contracts/level-synchronization.port.ts
 * 🎯 Purpose: Defines one serialized synchronization with an owner-pure target calculation.
 * 🧠 Responsibilities: Keeps balance/definition facts and the target derivation explicit.
 * 🏗️ Architecture: Levels-owned business port without ORM, locks or foreign services.
 * ⚠️ Important: Derivation is synchronous policy, never a persistence/network callback.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  LevelDefinition,
  LevelEvent,
  LevelSyncResult,
} from '../domain/types/levels.type';

export type LevelTargetDerivation = (
  balance: number,
  definitions: readonly LevelDefinition[],
) => number;

export type LevelSynchronizationEvent = Readonly<LevelEvent>;

export interface LevelSynchronization {
  sync(
    event: LevelSynchronizationEvent,
    derive: LevelTargetDerivation,
  ): Promise<LevelSyncResult>;
}

export const LEVEL_SYNCHRONIZATION = Symbol('LEVEL_SYNCHRONIZATION');
