/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Subject Read Composition
 * 📄 File: apps/api/src/composition/iam-subject-reads/iam-subject-read-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires independent IAM reads without coupling feature modules or adding a transaction.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuthModule } from '@api/modules/auth';
import {
  IamModule,
  IAM_SUBJECT_EXISTENCE_READER,
  IAM_ASSIGNMENT_READER,
} from '@api/modules/iam';
import { AuthSubjectExistenceAdapter } from './infrastructure/auth-subject-existence.adapter';
import { PrismaIamAssignmentReader } from './infrastructure/prisma-iam-assignment.reader';
@Global()
@Module({
  imports: [PrismaModule, AuthModule, IamModule],
  providers: [
    {
      provide: IAM_SUBJECT_EXISTENCE_READER,
      useClass: AuthSubjectExistenceAdapter,
    },
    { provide: IAM_ASSIGNMENT_READER, useClass: PrismaIamAssignmentReader },
  ],
  exports: [IAM_SUBJECT_EXISTENCE_READER, IAM_ASSIGNMENT_READER],
})
export class IamSubjectReadCompositionModule {}
