/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Consumption Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/consumption-queries.ts
 * 🎯 Purpose: Supplies actual indexed due/recovery/current-token query factories.
 * 🧠 Responsibilities: Merges locked state lanes without a candidate-only head cap.
 * 🏗️ Architecture: Root-owned infrastructure SQL; no owner tables.
 * ⚠️ Important: Each due lane locks at most one batch; unused candidate locks end with the short transaction.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { ConsumptionClaim } from '../contracts/consumption.types';
import { GAMIFICATION_DESTINATION as destination } from '../contracts/routing.constants';

export function dueConsumptionQuery(limit: number): Prisma.Sql {
  return Prisma.sql`WITH tick AS MATERIALIZED (SELECT timezone('UTC',clock_timestamp())::timestamp(3) AS now), ready AS MATERIALIZED (
    SELECT "admissionId","availableAt" FROM gamification_consumption_receipts
    WHERE destination=${destination} AND state='READY' AND "availableAt"<=(SELECT now FROM tick)
    ORDER BY "availableAt","admissionId" LIMIT ${limit} FOR UPDATE SKIP LOCKED
  ), retry AS MATERIALIZED (
    SELECT "admissionId","availableAt" FROM gamification_consumption_receipts
    WHERE destination=${destination} AND state='RETRY_DUE' AND "availableAt"<=(SELECT now FROM tick)
    ORDER BY "availableAt","admissionId" LIMIT ${limit} FOR UPDATE SKIP LOCKED
  ) SELECT "admissionId" FROM (SELECT * FROM ready UNION ALL SELECT * FROM retry) candidates
    ORDER BY "availableAt","admissionId" LIMIT ${limit}`;
}

export function expiredConsumptionQuery(limit: number): Prisma.Sql {
  return Prisma.sql`WITH tick AS MATERIALIZED (SELECT timezone('UTC',clock_timestamp())::timestamp(3) AS now)
    SELECT "admissionId",epoch,"claimSequence","claimToken","claimedAt","leaseUntil",
    "technicalFailures","pointsDone","levelsDone","achievementsDone"
    FROM gamification_consumption_receipts
    WHERE destination=${destination} AND state='RUNNING' AND "leaseUntil"<=(SELECT now FROM tick)
    ORDER BY "leaseUntil","admissionId" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
}

export function currentConsumptionQuery(claim: ConsumptionClaim): Prisma.Sql {
  return Prisma.sql`SELECT "admissionId",epoch,"claimSequence","claimToken","claimedAt","leaseUntil",
    "technicalFailures","pointsDone","levelsDone","achievementsDone"
    FROM gamification_consumption_receipts
    WHERE destination=${destination} AND "admissionId"=${claim.admissionId}::uuid AND state='RUNNING'
      AND epoch=${claim.epoch} AND "claimSequence"=${claim.sequence} AND "claimToken"=${claim.token}::uuid
    FOR UPDATE`;
}
