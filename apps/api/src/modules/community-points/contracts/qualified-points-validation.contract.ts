/** Owner shape check for already copied data; no eligibility or persistence IO. */
import { PointQualificationBlockedError } from '../domain/errors/point-qualification-blocked.error';
import { validateQualifiedPointCommand } from '../domain/qualified-points.validation';
import type { QualifiedPointCommand } from '../domain/types/qualified-points.type';

export function isQualifiedPointCommand(
  value: unknown,
): value is QualifiedPointCommand {
  try {
    validateQualifiedPointCommand(value);
    return true;
  } catch (error) {
    if (error instanceof PointQualificationBlockedError) return false;
    throw error;
  }
}
