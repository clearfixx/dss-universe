/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization Read Composition
 * 📄 File: apps/api/src/composition/authorization-reads/infrastructure/prisma-authorization-subject.reader.ts
 *
 * 🎯 Purpose:
 * Composes Auth-owned anchor predicates and IAM relations without a new snapshot or pre-read.
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
import type { AuthorizationSubjectAssignmentFacts } from '@api/core/authorization';
import { subjectById } from '@api/modules/auth/infrastructure';
import {
  iamAuthorizationSelect,
  mapAuthorizationAssignmentFacts,
} from '@api/modules/iam/infrastructure';
@Injectable()
export class PrismaAuthorizationSubjectReader implements AuthorizationSubjectAssignmentFacts {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: { user: PrismaService['user'] },
  ) {}
  async read(subjectId: string) {
    const user = await this.prisma.user.findUnique({
      where: subjectById(subjectId),
      select: iamAuthorizationSelect,
    });
    return mapAuthorizationAssignmentFacts(user);
  }
}
