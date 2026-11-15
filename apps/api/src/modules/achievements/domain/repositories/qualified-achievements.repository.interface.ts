/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/domain/repositories/qualified-achievements.repository.interface.ts
 * 🎯 Purpose: Separates qualification state transactions from command orchestration.
 * 🏗️ Architecture: Owner-only persistence port with no Prisma transaction in business contracts.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  AchievementConsumption,
  AchievementEvent,
  AchievementRule,
} from '../types/achievements.type';
import type {
  AchievementFactReference,
  QualifiedAchievementCommand,
  QualifiedAchievementFact,
  QualifiedAchievementOutcome,
} from '../types/qualified-achievement.type';

export type QualificationStep =
  | Exclude<QualifiedAchievementOutcome, { status: 'COMPLETE' }>
  | { status: 'READY'; examined: number };
export interface QualifiedAchievementsRepository {
  resolveLegacy(
    event: AchievementEvent,
    rollback: { sourceType: string; sourceId: string } | null,
  ): Promise<
    | { status: 'UNENROLLED' }
    | { status: 'BLOCKED' }
    | { status: 'MAPPED'; command: QualifiedAchievementCommand }
  >;
  prepare(command: QualifiedAchievementCommand): Promise<void>;
  advanceSources(
    facts: readonly QualifiedAchievementFact[],
  ): Promise<QualificationStep>;
  consumeRule(
    command: QualifiedAchievementCommand,
    contribution: AchievementFactReference,
    rule: AchievementRule,
    event: AchievementEvent,
    recipientId: string,
  ): Promise<
    | AchievementConsumption
    | Extract<QualifiedAchievementOutcome, { status: 'CONTINUE' }>
  >;
}
export const QUALIFIED_ACHIEVEMENTS_REPOSITORY = Symbol(
  'QUALIFIED_ACHIEVEMENTS_REPOSITORY',
);
