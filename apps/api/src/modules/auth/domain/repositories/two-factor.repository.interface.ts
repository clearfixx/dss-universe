/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/two-factor.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines private second-factor persistence without ORM or profile records.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface TwoFactorRepository {
  status(
    subjectId: string,
  ): Promise<{ enabled: boolean; recoveryCodesRemaining: number }>;
  begin(subjectId: string, encryptedSecret: string): Promise<boolean>;
  confirm(
    subjectId: string,
    verify: (encryptedSecret: string) => boolean,
    recoveryHashes: string[],
  ): Promise<'confirmed' | 'missing' | 'invalid'>;
  findEnabledSecret(subjectId: string): Promise<string | null>;
  consumeRecovery(subjectId: string, recoveryHash: string): Promise<boolean>;
  findPasswordHash(subjectId: string): Promise<string | null>;
  disable(subjectId: string): Promise<void>;
}
export const TWO_FACTOR_REPOSITORY = Symbol('TWO_FACTOR_REPOSITORY');
