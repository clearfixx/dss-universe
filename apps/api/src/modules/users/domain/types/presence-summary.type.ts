/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/presence-summary.type.ts
 *
 * 🎯 Purpose:
 * Defines privacy-safe aggregate presence metrics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export interface PresenceSummary {
  onlineMembers: number;
  onlineGuests: number;
  onlineCrawlers: number;
  totalOnline: number;
  sampledAt: Date;
}

/**
 * Aggregate the crowd, never publish its fingerprints.
 */
