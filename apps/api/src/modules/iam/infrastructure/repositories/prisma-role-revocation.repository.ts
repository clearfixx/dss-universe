/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role-revocation.repository.ts
 *
 * 🎯 Purpose:
 * Delegates protected role removal through the IAM-owned semantic transaction port.
 *
 * 🧠 Responsibilities:
 * • forwards subject/role IDs and the existing IAM safety callback;
 * • retains established results without foreign SQL or transaction lifetime;
 * • propagates owned writer and safety failures without fallback.
 *
 * 🏗️ Architecture:
 * Private IAM repository; root owns lifetime and the guarded IAM writer owns persistence.
 *
 * ⚠️ Important:
 * READ COMMITTED refreshes the count after lock waits. Policy errors roll back.
 * This protects IAM revocation, not account deletion or usable-admin eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_REVOCATION_TRANSACTION,
  type RoleRevocationTransaction,
} from '../../contracts/role-revocation-transaction.port';

import type {
  RoleRevocationRepository,
  RoleRevocationResult,
} from '../../user-access/contracts/role-revocation.repository.interface';

@Injectable()
export class PrismaRoleRevocationRepository implements RoleRevocationRepository {
  constructor(
    @Inject(ROLE_REVOCATION_TRANSACTION)
    private readonly writes: RoleRevocationTransaction,
  ) {}

  revoke(
    subjectId: string,
    roleId: string,
    assertCanRevoke: Parameters<RoleRevocationRepository['revoke']>[2],
  ): Promise<RoleRevocationResult> {
    return this.writes.revoke(subjectId, roleId, assertCanRevoke);
  }
}
