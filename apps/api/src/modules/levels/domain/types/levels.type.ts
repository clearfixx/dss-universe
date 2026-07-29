/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/domain/types/levels.type.ts
 *
 * 🎯 Purpose:
 * Defines configurable level thresholds, progress and immutable transitions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type LevelDefinition = {
  level: number;
  threshold: number;
  updatedById: string | null;
  updatedAt: Date;
};

export type LevelProgress = {
  userId: string;
  balance: number;
  currentLevel: number;
  currentThreshold: number;
  nextLevel: number | null;
  nextThreshold: number | null;
  pointsIntoLevel: number;
  pointsNeeded: number;
  progressPercent: number;
};

export type LevelTransitionDirection = 'UP' | 'DOWN';

export type LevelTransition = {
  id: string;
  userId: string;
  fromLevel: number;
  toLevel: number;
  direction: LevelTransitionDirection;
  balance: number;
  sourceEventId: string;
  sourceEventName: string;
  occurredAt: Date;
};

export type LevelTransitionHistory = {
  items: LevelTransition[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type LevelEvent = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  userId: string;
  occurredAt: Date;
};

export type LevelSyncResult = {
  duplicate: boolean;
  transitions: LevelTransition[];
};

/**
 * Levels are coordinates on the points map, never a second points balance.
 */
