/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260729143000_add_leaderboard_indexes/migration.sql
 * Purpose: Adds range-first indexes for period leaderboard projections.
 */

CREATE INDEX "community_point_entries_occurredAt_userId_idx"
  ON "community_point_entries"("occurredAt", "userId");

CREATE INDEX "reputation_entries_createdAt_recipientId_idx"
  ON "reputation_entries"("createdAt", "recipientId");

/*
 * Fast rankings still come from honest ledgers.
 */
