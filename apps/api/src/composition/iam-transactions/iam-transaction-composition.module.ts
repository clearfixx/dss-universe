/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Transaction Composition
 * 📄 File: apps/api/src/composition/iam-transactions/iam-transaction-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires owned IAM writes and Auth existence behind semantic transaction ports.
 *
 * 🧠 Responsibilities:
 * • registers guarded stateless adapters outside feature modules;
 * • exports only the two operation-specific command tokens.
 *
 * 🏗️ Architecture:
 * Root assembly; IAM and Auth never import each other's implementation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import {
  IamModule,
  MEMBERSHIP_GRANT_TRANSACTION,
  ROLE_REVOCATION_TRANSACTION,
} from '@api/modules/iam';
import {
  PrismaMembershipGrantWriter,
  PrismaRoleRevocationWriter,
} from '@api/modules/iam/infrastructure';
import { PrismaTransactionalSubjectExistenceReader } from '@api/modules/auth/infrastructure';
import { PrismaMembershipGrantTransaction } from './infrastructure/prisma-membership-grant.transaction';
import { PrismaRoleRevocationTransaction } from './infrastructure/prisma-role-revocation.transaction';
@Global()
@Module({
  imports: [PrismaModule, AuditModule, IamModule],
  providers: [
    PrismaMembershipGrantWriter,
    PrismaRoleRevocationWriter,
    PrismaTransactionalSubjectExistenceReader,
    {
      provide: MEMBERSHIP_GRANT_TRANSACTION,
      useClass: PrismaMembershipGrantTransaction,
    },
    {
      provide: ROLE_REVOCATION_TRANSACTION,
      useClass: PrismaRoleRevocationTransaction,
    },
  ],
  exports: [MEMBERSHIP_GRANT_TRANSACTION, ROLE_REVOCATION_TRANSACTION],
})
export class IamTransactionCompositionModule {}
