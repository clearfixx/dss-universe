/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-password-reset.repository.ts
 *
 * 🎯 Purpose:
 * Atomically consumes reset credentials and invalidates previous authentication.
 *
 * 🧠 Responsibilities:
 * • locks authoritative account state and verifies token version/expiry;
 * • updates credentials, revokes sessions and records transactional audit;
 * • returns only the committed notification destination.
 *
 * 🏗️ Architecture:
 * Auth-owned persistence adapter implementing the domain reset contract.
 *
 * ⚠️ Important:
 * Audit failure rolls back all writes. Raw reset tokens never enter persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type { PasswordResetRepository } from '../../domain/repositories/password-reset.repository.interface';

@Injectable()
export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async consume(
    tokenHash: string,
    passwordHash: string,
  ): Promise<Readonly<{ email: string }> | null> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.passwordReset.findUnique({
        where: { tokenHash },
        select: { userId: true, authVersion: true },
      });
      if (!candidate) return null;
      // All issuance and consumption lock the user first. Two different reset
      // tokens cannot race each other or resurrect a previous credential.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: candidate.userId },
        select: { id: true, email: true, status: true, authVersion: true },
      });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.authVersion !== candidate.authVersion
      )
        return null;
      const consumed = await tx.passwordReset.deleteMany({
        where: {
          userId: user.id,
          tokenHash,
          expiresAt: { gt: new Date() },
          authVersion: user.authVersion,
        },
      });
      if (consumed.count !== 1) return null;
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          loginFailedAttempts: 0,
          loginLockedUntil: null,
        },
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.append(tx, {
        action: 'auth.password.recovered',
        actorType: 'USER',
        actorId: user.id,
        targetType: 'User',
        targetId: user.id,
      });
      return { email: user.email };
    });
  }
}
