/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Persistence
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-profile-role.shape.ts
 *
 * 🎯 Purpose:
 * Defines the owned role-membership predicate for guarded directory query assembly.
 *
 * 🧠 Responsibilities:
 * • keeps role-name matching case-insensitive without selecting role/profile aggregates;
 * • does not turn display filtering into an effective authorization decision.
 *
 * 🏗️ Architecture:
 * Pure operation-specific infrastructure fragment; imported only through the guarded technical entry.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
export function profileDirectoryRole(
  role: string | undefined,
): Prisma.UserWhereInput {
  return role
    ? {
        roles: {
          some: { role: { name: { equals: role, mode: 'insensitive' } } },
        },
      }
    : {};
}
