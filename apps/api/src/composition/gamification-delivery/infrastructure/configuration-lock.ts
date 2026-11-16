import type { TransactionClient } from '@api/core/database';

export async function lockGamificationConfiguration(
  transaction: TransactionClient,
  exclusive: boolean,
): Promise<void> {
  const key = 'gamification-config:gamification.v1';
  if (exclusive)
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
  else
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtextextended(${key},0))`;
}
