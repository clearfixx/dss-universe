/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: apps/api/src/core/authorization/contracts/subject-access-reader.interface.ts
 *
 * 🎯 Purpose:
 * Publishes the synchronous current access view owned by Authorization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface SubjectAccessReader {
  getAccessProfileByUserId(subjectId: string): Promise<
    Readonly<{
      roles: readonly string[];
      permissions: readonly string[];
    }>
  >;
}

export const SUBJECT_ACCESS_READER = Symbol('SUBJECT_ACCESS_READER');
