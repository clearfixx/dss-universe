/** DSS Universe — owner persistence command; no transaction crosses this port. */
import type {
  PointFacet,
  PointFacetResult,
  QualifiedPointCommand,
} from '../types/qualified-points.type';

export const QUALIFIED_POINTS_REPOSITORY = Symbol(
  'QUALIFIED_POINTS_REPOSITORY',
);
export interface QualifiedPointsRepository {
  consumeFacet(
    command: QualifiedPointCommand,
    facet: PointFacet,
  ): Promise<PointFacetResult>;
}
