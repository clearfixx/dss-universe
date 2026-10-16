/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role-revocation.writer.ts
 *
 * 🎯 Purpose:
 * Retains locked role-holder safety while root supplies opaque subject existence.
 *
 * 🧠 Responsibilities:
 * • preserves subject, locked role and assignment short-circuit order;
 * • counts holders and deletes only after the synchronous IAM policy check.
 *
 * 🏗️ Architecture:
 * Stateless owner writer; Auth SQL and transaction lifetime remain outside IAM.
 *
 * ⚠️ Important:
 * Root must retain Read Committed. No new audit/outbox or usable-admin policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
import type {
  RoleRevocationCheck,
  RoleRevocationResult,
} from '../../contracts/role-revocation-transaction.port';
@Injectable()
export class PrismaRoleRevocationWriter {
  async revoke(
    transaction: TransactionClient,
    subjectId: string,
    roleId: string,
    subjectExists: () => Promise<boolean>,
    assertCanRevoke: RoleRevocationCheck,
  ): Promise<RoleRevocationResult> {
    if (!(await subjectExists())) return 'subject-not-found';
    await transaction.$queryRaw`SELECT id FROM roles WHERE id = ${roleId} FOR UPDATE`;
    const role = await transaction.role.findUnique({
      where: { id: roleId },
      select: { name: true },
    });
    if (!role) return 'role-not-found';
    const assignment = await transaction.userRole.findUnique({
      where: { userId_roleId: { userId: subjectId, roleId } },
      select: { userId: true },
    });
    if (!assignment) return 'assignment-not-found';
    const count = await transaction.userRole.count({ where: { roleId } });
    assertCanRevoke({ roleName: role.name, adminsWithRoleCount: count });
    await transaction.userRole.delete({
      where: { userId_roleId: { userId: subjectId, roleId } },
      select: { userId: true },
    });
    return 'revoked';
  }
}
