/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/domain/errors/qualification-blocked.error.ts
 * 🎯 Purpose: Rolls back an owner transaction on a known qualification conflict.
 * 🏗️ Architecture: Plain owned failure with bounded disposition; no HTTP or driver details.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AchievementQualificationBlockCode } from '../types/qualified-achievement.type';

export class QualificationBlockedError extends Error {
  constructor(readonly code: AchievementQualificationBlockCode) {
    super(code);
    this.name = 'QualificationBlockedError';
  }
}
