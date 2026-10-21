/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-subject-anchor.shape.ts
 *
 * 🎯 Purpose:
 * Owns the ID-only Auth anchor fragments for guarded root persistence assembly.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const subjectAnchorSelect = Object.freeze({ id: true } as const);
export function subjectById(subjectId: string) {
  return { id: subjectId };
}
