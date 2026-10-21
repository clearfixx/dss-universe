/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-profile-existence.reader.ts
 *
 * 🎯 Purpose:
 * Answers profile existence using an ID-only owned persistence projection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { ProfileExistenceReader } from '../../contracts/profile-existence.contract';

@Injectable()
export class PrismaProfileExistenceReader implements ProfileExistenceReader {
  constructor(private readonly prisma: PrismaService) {}
  async exists(subjectId: string): Promise<boolean> {
    return Boolean(
      await this.prisma.user.findUnique({
        where: { id: subjectId },
        select: { id: true },
      }),
    );
  }
}
