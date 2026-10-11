/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/password-reset.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines atomic reset consumption without exposing ORM records or transactions.
 *
 * ⚠️ Important:
 * Only a committed reset returns a notification destination; hashes stay private.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface PasswordResetRepository {
  consume(
    tokenHash: string,
    passwordHash: string,
  ): Promise<Readonly<{ email: string }> | null>;
}
export const PASSWORD_RESET_REPOSITORY = Symbol('PASSWORD_RESET_REPOSITORY');
