/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/ports/gate-reputation-total.interface.ts
 *
 * 🎯 Purpose:
 * Defines the scalar reputation evidence needed by gate thresholds.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GATE_REPUTATION_TOTAL = Symbol('GATE_REPUTATION_TOTAL');
export interface GateReputationTotalReader {
  totalFor(recipientId: string): Promise<number>;
}
