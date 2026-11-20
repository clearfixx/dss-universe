/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Consumption Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/consumption-storage.types.ts
 * 🎯 Purpose: Names the exact private locked-row projection used by receipt operations.
 * 🧠 Responsibilities: Keeps SQL timestamps/counters distinct from transport data.
 * 🏗️ Architecture: Infrastructure-only row data; no ORM or business services.
 * ⚠️ Important: A row type does not establish current-token ownership without its query.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type LockedConsumption = {
  admissionId: string;
  epoch: bigint;
  claimSequence: bigint;
  claimToken: string;
  claimedAt: Date;
  leaseUntil: Date;
  technicalFailures: number;
  pointsDone: boolean;
  levelsDone: boolean;
  achievementsDone: boolean;
};
