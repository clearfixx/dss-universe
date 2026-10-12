/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/contracts/recovery-rate-limit.interface.ts
 *
 * 🎯 Purpose:
 * Defines the private attempt-budget capability without Redis keys or commands.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface RecoveryRateLimit {
  allow(
    scope: 'email' | 'request-ip' | 'token' | 'reset-ip',
    value: string,
    limit: number,
  ): Promise<boolean>;
}
export const RECOVERY_RATE_LIMIT = Symbol('RECOVERY_RATE_LIMIT');
