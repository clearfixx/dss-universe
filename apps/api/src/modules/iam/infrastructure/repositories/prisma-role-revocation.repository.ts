/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role-revocation.repository.ts
 *
 * 🎯 Purpose:
 * Serializes role-holder removal so application safety policy sees current state.
 *
 * 🧠 Responsibilities:
 * • validates opaque subject and role/assignment existence;
 * • locks the shared role before counting holders;
 * • commits deletion only after synchronous application policy accepts it.
 *
 * 🏗️ Architecture:
 * Private IAM transaction adapter; no ORM client or profile crosses its port.
 *
 * ⚠️ Important:
 * READ COMMITTED refreshes the count after lock waits. Policy errors roll back.
 * This protects IAM revocation, not account deletion or usable-admin eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  RoleRevocationRepository,
  RoleRevocationResult,
} from '../../user-access/contracts/role-revocation.repository.interface';

@Injectable()
export class PrismaRoleRevocationRepository implements RoleRevocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  revoke(
    subjectId: string,
    roleId: string,
    assertCanRevoke: Parameters<RoleRevocationRepository['revoke']>[2],
  ): Promise<RoleRevocationResult> {
    return this.prisma.$transaction<RoleRevocationResult>(
      async (transaction) => {
        const subject = await transaction.user.findUnique({
          where: { id: subjectId },
          select: { id: true },
        });
        if (!subject) return 'subject-not-found';
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
