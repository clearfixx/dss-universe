/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-login-abuse.repository.ts
 *
 * 🎯 Purpose:
 * Persists authoritative login counters and audit in owned transactions.
 *
 * 🧠 Responsibilities:
 * • serializes failed attempts using the existing account row lock;
 * • records lock transitions and successful-login resets with atomic audit;
 * • returns only a committed lock notification destination.
 *
 * 🏗️ Architecture:
 * Auth infrastructure adapter; application ports never expose database clients.
 *
 * ⚠️ Important:
 * Preserve existing threshold and notification rules; audit failure rolls back writes.
 * Redis policy and mail delivery belong outside this persistence adapter.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type {
  LoginAbuseRepository,
  LoginAuditContext,
} from '../../domain/repositories/login-abuse.repository.interface';

@Injectable()
export class PrismaLoginAbuseRepository implements LoginAbuseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  recordFailure(
    subjectId: string,
    policy: Readonly<{ failureLimit: number; lockMs: number }>,
    client: LoginAuditContext,
  ): Promise<Readonly<{ email: string }> | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${subjectId} FOR UPDATE`;
      const current = await tx.user.findUnique({
        where: { id: subjectId },
        select: {
          email: true,
          loginFailedAttempts: true,
          loginLockedUntil: true,
        },
      });
      if (!current) return null;
      const attempts = current.loginFailedAttempts + 1;
      const shouldLock = attempts >= policy.failureLimit;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + policy.lockMs)
        : current.loginLockedUntil;
      await tx.user.update({
        where: { id: subjectId },
        data: { loginFailedAttempts: attempts, loginLockedUntil: lockedUntil },
      });
      if (shouldLock && !current.loginLockedUntil) {
        await this.audit.append(tx, {
          action: 'auth.login.locked',
          actorType: 'SYSTEM',
          targetType: 'User',
          targetId: subjectId,
          result: 'DENIED',
          reason: 'Repeated invalid login credentials',
          ipAddress: client.ipAddress,
          userAgent: client.userAgent,
          metadata: { attempts, lockMinutes: policy.lockMs / 60_000 },
        });
        return { email: current.email };
      }
      return null;
    });
  }

  async recordSuccess(
    subjectId: string,
    client: LoginAuditContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: subjectId },
        data: { loginFailedAttempts: 0, loginLockedUntil: null },
      });
      await this.audit.append(tx, {
        action: 'auth.login.succeeded',
        actorType: 'USER',
        actorId: subjectId,
        targetType: 'User',
        targetId: subjectId,
        ipAddress: client.ipAddress,
        userAgent: client.userAgent,
      });
    });
  }
}
