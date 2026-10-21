/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/login-abuse.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines durable login-attempt transitions with atomic audit, without ORM leakage.
 *
 * ⚠️ Important:
 * A notification destination returns only after commit; no profile or hashes return.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type LoginAuditContext = Readonly<{
  ipAddress?: string;
  userAgent?: string;
}>;
export interface LoginAbuseRepository {
  recordFailure(
    subjectId: string,
    policy: Readonly<{ failureLimit: number; lockMs: number }>,
    client: LoginAuditContext,
  ): Promise<Readonly<{ email: string }> | null>;
  recordSuccess(subjectId: string, client: LoginAuditContext): Promise<void>;
}
export const LOGIN_ABUSE_REPOSITORY = Symbol('LOGIN_ABUSE_REPOSITORY');
