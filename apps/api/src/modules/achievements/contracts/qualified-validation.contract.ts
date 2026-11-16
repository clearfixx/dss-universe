/** Pure owner shape boundary over copied data; this does not attest a producer. */
import { validateQualifiedAchievementCommand } from '../application/services/qualified-achievement-validation';
import { QualificationBlockedError } from '../domain/errors/qualification-blocked.error';
import type { QualifiedAchievementCommand } from '../domain/types/qualified-achievement.type';

export function isQualifiedAchievementCommand(
  value: unknown,
): value is QualifiedAchievementCommand {
  try {
    validateQualifiedAchievementCommand(value);
    return true;
  } catch (error) {
    if (error instanceof QualificationBlockedError) return false;
    throw error;
  }
}
