/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-email-verification.repository.ts
 *
 * 🎯 Purpose:
 * Owns verification eligibility reads and atomic token consumption with audit.
 *
 * 🧠 Responsibilities:
 * • selects only a pending active account's delivery destination;
 * • serializes consumption and enforces expiry;
 * • commits verification state and audit together.
 *
 * 🏗️ Architecture:
 * Private Auth repository adapter implementing its domain persistence port.
 *
 * ⚠️ Important:
 * Do not expose ORM records or transaction clients to application services.
 * Preserve the existing consume policy; resend eligibility is not a new consume gate.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import type { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository.interface';

@Injectable()
export class PrismaEmailVerificationRepository implements EmailVerificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async findPendingDestination(
    subjectId: string,
  ): Promise<Readonly<{ email: string }> | null> {
    return this.prisma.user.findFirst({
      where: { id: subjectId, status: 'ACTIVE', emailVerifiedAt: null },
      select: { email: true },
    });
  }

  async consume(tokenHash: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const credential = await tx.emailVerification.findUnique({
        where: { tokenHash },
        select: { userId: true },
      });
      if (!credential) return false;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${credential.userId} FOR UPDATE`;
      const consumed = await tx.emailVerification.deleteMany({
        where: {
          userId: credential.userId,
          tokenHash,
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) return false;
      const user = await tx.user.update({
        where: { id: credential.userId },
        data: { emailVerifiedAt: new Date() },
        select: { id: true },
      });
      await this.audit.append(tx, {
        action: 'auth.email.verified',
        actorType: 'USER',
        actorId: user.id,
        targetType: 'User',
        targetId: user.id,
      });
      return true;
    });
  }
}
