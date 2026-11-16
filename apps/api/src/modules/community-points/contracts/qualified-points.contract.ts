/** DSS Universe — named, inactive owner capability; never exposes repositories. */
import type {
  QualifiedPointCommand,
  QualifiedPointOutcome,
} from '../domain/types/qualified-points.type';

export const QUALIFIED_POINTS_CONSUMER = Symbol('QUALIFIED_POINTS_CONSUMER');
export interface QualifiedPointsConsumer {
  advance(command: QualifiedPointCommand): Promise<QualifiedPointOutcome>;
}
