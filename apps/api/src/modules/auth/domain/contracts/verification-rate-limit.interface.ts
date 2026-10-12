/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/contracts/verification-rate-limit.interface.ts
 *
 * 🎯 Purpose:
 * Defines the private attempt-budget capability without Redis keys or commands.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface VerificationRateLimit {
  allow(scope: 'user' | 'ip', value: string, limit: number): Promise<boolean>;
}
export const VERIFICATION_RATE_LIMIT = Symbol('VERIFICATION_RATE_LIMIT');
