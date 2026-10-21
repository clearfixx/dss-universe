/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-subject-existence.reader.ts
 *
 * 🎯 Purpose:
 * Reads independent Auth subject existence without ACTIVE filtering or caching.
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
import type { AuthSubjectExistenceReader } from '../../contracts/subject-existence-reader.contract';
import {
  subjectAnchorSelect,
  subjectById,
} from './prisma-subject-anchor.shape';
@Injectable()
export class PrismaSubjectExistenceReader implements AuthSubjectExistenceReader {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: { user: PrismaService['user'] },
  ) {}
  async exists(subjectId: string): Promise<boolean> {
    return (
      (await this.prisma.user.findUnique({
        where: subjectById(subjectId),
        select: subjectAnchorSelect,
      })) !== null
    );
  }
}
