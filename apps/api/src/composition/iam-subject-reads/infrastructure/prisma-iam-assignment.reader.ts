/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Subject Read Composition
 * 📄 File: apps/api/src/composition/iam-subject-reads/infrastructure/prisma-iam-assignment.reader.ts
 *
 * 🎯 Purpose:
 * Assembles Auth anchors and IAM facts using the unchanged independent nested read.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { IamAssignmentReader } from '@api/modules/iam';
import {
  iamAssignmentSelect,
  mapIamAssignments,
} from '@api/modules/iam/infrastructure';
import {
  subjectAnchorSelect,
  subjectById,
} from '@api/modules/auth/infrastructure';
@Injectable()
export class PrismaIamAssignmentReader implements IamAssignmentReader {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: { user: PrismaService['user'] },
  ) {}
  async find(subjectId: string) {
    const user = await this.prisma.user.findUnique({
      where: subjectById(subjectId),
      select: { ...subjectAnchorSelect, ...iamAssignmentSelect },
    });
    return user ? mapIamAssignments(user.id, user) : null;
  }
}
