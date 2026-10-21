/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/contracts/request-access-reader.interface.ts
 *
 * 🎯 Purpose:
 * Defines current access context needed by request authentication mechanics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface RequestAccessReader {
  readForSubject(subjectId: string): Promise<
    Readonly<{
      roles: readonly string[];
      permissions: readonly string[];
    }>
  >;
}

export const REQUEST_ACCESS_READER = Symbol('REQUEST_ACCESS_READER');
