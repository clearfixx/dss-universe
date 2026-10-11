/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-profile-display.reader.ts
 *
 * 🎯 Purpose:
 * Supplies a minimal display projection without loading internal user records.
 *
 * 🧠 Responsibilities:
 * • selects only username by opaque subject ID;
 * • propagates storage failures instead of fabricating display identity.
 *
 * 🏗️ Architecture:
 * Users-owned infrastructure adapter for the public display-read contract.
 *
 * ⚠️ Important:
 * No credential, status or permission fields belong in this projection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { ProfileDisplayReader } from '../../contracts/profile-display-reader.contract';

@Injectable()
export class PrismaProfileDisplayReader implements ProfileDisplayReader {
  constructor(private readonly prisma: PrismaService) {}

  async findUsername(subjectId: string): Promise<string | null> {
    const profile = await this.prisma.user.findUnique({
      where: { id: subjectId },
      select: { username: true },
    });
    return profile?.username ?? null;
  }
}
