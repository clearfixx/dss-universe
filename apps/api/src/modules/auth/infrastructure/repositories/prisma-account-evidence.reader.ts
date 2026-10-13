/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-account-evidence.reader.ts
 *
 * 🎯 Purpose:
 * Reads Auth-owned account age/eligibility through a minimal storage projection.
 *
 * 🧠 Responsibilities:
 * • selects only current status and account creation time;
 * • converts status into a minimal active flag;
 * • propagates missing/storage-failure evidence without guessing.
 *
 * 🏗️ Architecture:
 * Auth-owned infrastructure read capability; shared-row persistence is transitional.
 *
 * ⚠️ Important:
 * This is account evidence, not permission to load profile fields or credentials.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  AuthAccountEvidenceReader,
  AuthAccountEvidence,
} from '../../contracts/account-evidence.contract';
@Injectable()
export class PrismaAccountEvidenceReader implements AuthAccountEvidenceReader {
  constructor(private readonly prisma: PrismaService) {}
  async find(subjectId: string): Promise<AuthAccountEvidence | null> {
    const account = await this.prisma.user.findUnique({
      where: { id: subjectId },
      select: { status: true, createdAt: true },
    });
    return account
      ? {
          active: account.status === 'ACTIVE',
          createdAt: new Date(account.createdAt),
        }
      : null;
  }
}
