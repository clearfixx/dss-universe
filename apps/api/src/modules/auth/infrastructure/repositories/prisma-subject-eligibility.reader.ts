/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-subject-eligibility.reader.ts
 *
 * 🎯 Purpose:
 * Reads only Auth-owned active-state evidence for capability decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { AuthSubjectEligibility } from '../../contracts/subject-eligibility.contract';
@Injectable()
export class PrismaSubjectEligibilityReader implements AuthSubjectEligibility {
  constructor(private readonly prisma: PrismaService) {}
  async isEligible(subjectId: string): Promise<boolean> {
    const subject = await this.prisma.user.findUnique({
      where: { id: subjectId },
      select: { status: true },
    });
    return subject?.status === 'ACTIVE';
  }
}
