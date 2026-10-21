/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/authorization-assignment.shape.ts
 *
 * 🎯 Purpose:
 * Owns the legacy unsorted relation projection and first-seen assignment deduplication.
 *
 * 🏗️ Architecture:
 * Owned fact boundary; root infrastructure assembles cross-owner persistence.
 *
 * ⚠️ Important:
 * Preserve current query schedule and first-seen order; no ACTIVE policy, cache or fallback on failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
export const iamAuthorizationSelect = Object.freeze({
  roles: {
    select: {
      role: {
        select: {
          name: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  },
  directPermissions: { select: { permission: { select: { key: true } } } },
} as const);
type AssignmentRelations = Prisma.UserGetPayload<{
  select: typeof iamAuthorizationSelect;
}>;
export function mapAuthorizationAssignmentFacts(
  user: AssignmentRelations | null,
) {
  if (!user) return { roles: [], permissions: [] };
  const roles = user.roles.map(({ role }) => role.name);
  const rolePermissions = user.roles.flatMap(({ role }) =>
    role.permissions.map(({ permission }) => permission.key),
  );
  const directPermissions = user.directPermissions.map(
    ({ permission }) => permission.key,
  );
  return {
    roles: [...new Set<string>(roles)],
    permissions: [
      ...new Set<string>([...rolePermissions, ...directPermissions]),
    ],
  };
}
