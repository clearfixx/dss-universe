/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Transaction Composition
 * 📄 File: apps/api/src/composition/iam-transactions/infrastructure/prisma-role-revocation.transaction.ts
 *
 * 🎯 Purpose:
 * Binds protected IAM role removal and Auth existence to the existing Read Committed transaction.
 *
 * 🧠 Responsibilities:
 * • preserves explicit isolation for post-lock holder counts;
 * • binds the same client without copying owner SQL or adding evidence stages.
 *
 * 🏗️ Architecture:
 * Root unit behind IAM's operation-specific port; safety callback carries IAM facts only.
 *
 * ⚠️ Important:
 * No timeout/retry changes; policy/provider failures abort the existing transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  RoleRevocationTransaction,
  RoleRevocationCheck,
} from '@api/modules/iam';
import { PrismaRoleRevocationWriter } from '@api/modules/iam/infrastructure';
import { PrismaTransactionalSubjectExistenceReader } from '@api/modules/auth/infrastructure';
@Injectable()
export class PrismaRoleRevocationTransaction implements RoleRevocationTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: PrismaRoleRevocationWriter,
    private readonly subjects: PrismaTransactionalSubjectExistenceReader,
  ) {}
  revoke(
    subjectId: string,
    roleId: string,
    assertCanRevoke: RoleRevocationCheck,
  ) {
    return this.prisma.$transaction(
      (tx) =>
        this.writer.revoke(
          tx,
          subjectId,
          roleId,
          () => this.subjects.exists(tx, subjectId),
          assertCanRevoke,
        ),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
