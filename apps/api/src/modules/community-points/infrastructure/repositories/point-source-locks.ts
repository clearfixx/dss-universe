/** DSS Universe — private shared lock coordinates for legacy/qualified writers. */
import type { TransactionClient } from '@api/core/database';

export type PointSourceCoordinate = { sourceKind: string; sourceId: string };
export async function lockPointSources(
  transaction: TransactionClient,
  sources: readonly PointSourceCoordinate[],
): Promise<void> {
  const coordinates = [
    ...new Set(
      sources.map(
        (s) => `community-points-source-reversal:${s.sourceKind}:${s.sourceId}`,
      ),
    ),
  ].sort();
  for (const coordinate of coordinates) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))`;
  }
}
