/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Persistence
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role-display.reader.ts
 *
 * 🎯 Purpose:
 * Reads owned assignment/name facts for current profile role display.
 *
 * 🧠 Responsibilities:
 * • retains assignedAt ascending order and exact role-name case;
 * • retains the empty-input query and applies no new ACTIVE/permission filter.
 *
 * 🏗️ Architecture:
 * IAM-owned display adapter; no Users/Auth service or foreign profile query.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { IamRoleDisplayReader } from '../../contracts/role-display-reader.contract';

@Injectable()
export class PrismaRoleDisplayReader implements IamRoleDisplayReader {
  constructor(private readonly prisma: PrismaService) {}
  async readNames(
    subjectIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly string[]>> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: { in: [...subjectIds] } },
      select: { userId: true, role: { select: { name: true } } },
      orderBy: { assignedAt: 'asc' },
    });
    const result = new Map(
      subjectIds.map((subjectId) => [subjectId, [] as string[]]),
    );
    for (const assignment of assignments)
      result.get(assignment.userId)?.push(assignment.role.name);
    return result;
  }
}
