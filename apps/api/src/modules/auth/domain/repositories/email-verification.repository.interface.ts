/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/email-verification.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the private credential-verification persistence boundary without ORM or profile data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface EmailVerificationRepository {
  findPendingDestination(
    subjectId: string,
  ): Promise<Readonly<{ email: string }> | null>;
  consume(tokenHash: string): Promise<boolean>;
}

export const EMAIL_VERIFICATION_REPOSITORY = Symbol(
  'EMAIL_VERIFICATION_REPOSITORY',
);
