/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/contracts/qualified-consumer.contract.ts
 * 🎯 Purpose: Publishes the inactive qualified owner command without exposing owner services.
 * 🧠 Responsibilities: Makes durable continuation distinct from technical failure/completion.
 * 🏗️ Architecture: Narrow named owner input; no queue, transport or producer-journal dependency.
 * ⚠️ Important: A successful continuation is not an award receipt or permission to activate routing.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementOutcome,
} from '../domain/types/qualified-achievement.type';

export interface QualifiedAchievementConsumer {
  advance(
    command: QualifiedAchievementCommand,
  ): Promise<QualifiedAchievementOutcome>;
}

export const QUALIFIED_ACHIEVEMENT_CONSUMER = Symbol(
  'QUALIFIED_ACHIEVEMENT_CONSUMER',
);
