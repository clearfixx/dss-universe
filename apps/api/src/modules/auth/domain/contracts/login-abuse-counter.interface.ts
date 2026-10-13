/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/contracts/login-abuse-counter.interface.ts
 *
 * 🎯 Purpose:
 * Defines private login-attempt accounting without exposing Redis commands or keys.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface LoginAbuseCounter {
  isBlocked(scope: 'identity' | 'ip', value: string): Promise<boolean>;
  recordFailure(
    scope: 'identity' | 'ip',
    value: string,
    policy: Readonly<{
      failureLimit: number;
      windowMs: number;
      lockMs: number;
    }>,
  ): Promise<void>;
  clearIdentity(email: string): Promise<void>;
}
export const LOGIN_ABUSE_COUNTER = Symbol('LOGIN_ABUSE_COUNTER');
