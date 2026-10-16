/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Transaction Composition
 * 📄 File: apps/api/src/composition/iam-transactions/infrastructure/prisma-membership-grant.transaction.ts
 *
 * 🎯 Purpose:
 * Binds IAM membership writes and Auth subject existence to the unchanged default transaction.
 *
 * 🧠 Responsibilities:
 * • owns lifetime only, without owner SQL or new timeout/isolation/retry settings;
 * • supplies transaction-local existence at the writer's existing check point.
 *
 * 🏗️ Architecture:
 * Root unit behind the IAM-owned semantic membership command port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  GrantAccessMembership,
  MembershipGrantTransaction,
} from '@api/modules/iam';
import { PrismaMembershipGrantWriter } from '@api/modules/iam/infrastructure';
import { PrismaTransactionalSubjectExistenceReader } from '@api/modules/auth/infrastructure';
@Injectable()
export class PrismaMembershipGrantTransaction implements MembershipGrantTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: PrismaMembershipGrantWriter,
    private readonly subjects: PrismaTransactionalSubjectExistenceReader,
  ) {}
  grant(input: GrantAccessMembership, actorId: string) {
    return this.prisma.$transaction((tx) =>
      this.writer.grant(tx, input, actorId, () =>
        this.subjects.exists(tx, input.subjectId),
      ),
    );
  }
}
