/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role-permission-keys.reader.ts
 *
 * 🎯 Purpose:
 * Reads role permission keys using IAM persistence with the existing empty-input short circuit.
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
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { IamRolePermissionKeysReader } from '../../contracts/role-permission-keys-reader.contract';
@Injectable()
export class PrismaRolePermissionKeysReader implements IamRolePermissionKeysReader {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      rolePermission: PrismaService['rolePermission'];
    },
  ) {}
  async read(roleNames: string[]): Promise<string[]> {
    if (!roleNames.length) return [];
    const rows = await this.prisma.rolePermission.findMany({
      where: { role: { name: { in: roleNames } } },
      select: { permission: { select: { key: true } } },
    });
    return [...new Set<string>(rows.map(({ permission }) => permission.key))];
  }
}
