/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-assignment.shape.ts
 *
 * 🎯 Purpose:
 * Owns IAM relation selection and assignment mapping without Auth account fields.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { SubjectAccessAssignments } from '../../user-access/types/subject-access-assignments.type';
export const iamAssignmentSelect = Object.freeze({
  roles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  },
  directPermissions: {
    select: { permission: { select: { id: true, key: true } } },
    orderBy: { assignedAt: 'asc' },
  },
} as const);
type AssignmentRelations = Prisma.UserGetPayload<{
  select: typeof iamAssignmentSelect;
}>;
export function mapIamAssignments(
  subjectId: string,
  user: AssignmentRelations,
): SubjectAccessAssignments {
  return {
    subjectId,
    roles: user.roles.map(({ role }) => ({
      id: role.id,
      name: role.name,
      permissionKeys: role.permissions.map(({ permission }) => permission.key),
    })),
    directPermissions: user.directPermissions.map(({ permission }) => ({
      id: permission.id,
      key: permission.key,
    })),
  };
}
