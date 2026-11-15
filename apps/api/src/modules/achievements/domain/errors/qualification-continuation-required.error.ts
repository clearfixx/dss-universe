/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/domain/errors/qualification-continuation-required.error.ts
 * 🎯 Purpose: Requires legacy void-capability callers to use the explicit continuation contract.
 * 🏗️ Architecture: Private plain error; automatic orchestration uses QualifiedAchievementOutcome instead.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AchievementQualificationProgress } from '../types/qualified-achievement.type';
export class QualificationContinuationRequiredError extends Error {
  constructor(readonly progress: AchievementQualificationProgress) {
    super('Qualified achievement continuation required.');
    this.name = 'QualificationContinuationRequiredError';
  }
}
