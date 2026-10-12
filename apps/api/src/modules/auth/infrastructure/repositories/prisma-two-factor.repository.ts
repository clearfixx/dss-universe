/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-two-factor.repository.ts
 *
 * 🎯 Purpose:
 * Isolates second-factor persistence and transactional audit from application logic.
 *
 * 🧠 Responsibilities:
 * • reads minimal credential state;
 * • serializes lifecycle mutations with an existing subject row lock;
 * • commits disabling, revocation and audit atomically.
 *
 * 🏗️ Architecture:
 * Private Auth adapter; confirmation invokes a pure verifier under lock.
 *
 * ⚠️ Important:
 * Lock subject before factor state, including when no factor row exists.
 * No transaction client crosses the port.
 * Secret material must never enter audit metadata.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type { TwoFactorRepository } from '../../domain/repositories/two-factor.repository.interface';

@Injectable()
export class PrismaTwoFactorRepository implements TwoFactorRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}
  async status(userId: string) {
    const record = await this.prisma.userTwoFactor.findUnique({
      where: { userId },
      select: { enabledAt: true, recoveryCodeHashes: true },
    });
    return {
      enabled: Boolean(record?.enabledAt),
      recoveryCodesRemaining: record?.recoveryCodeHashes.length ?? 0,
    };
  }
  async begin(userId: string, encryptedSecret: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const current = await tx.userTwoFactor.findUnique({
        where: { userId },
        select: { enabledAt: true },
      });
      if (current?.enabledAt) return false;
      await tx.userTwoFactor.upsert({
        where: { userId },
        create: { userId, encryptedSecret },
        update: { encryptedSecret, recoveryCodeHashes: [], enabledAt: null },
      });
      return true;
    });
  }
  async confirm(
    userId: string,
    verify: (encryptedSecret: string) => boolean,
    recoveryHashes: string[],
  ): Promise<'confirmed' | 'missing' | 'invalid'> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const record = await tx.userTwoFactor.findUnique({
        where: { userId },
        select: { enabledAt: true, encryptedSecret: true },
      });
      if (!record || record.enabledAt) return 'missing';
      if (!verify(record.encryptedSecret)) return 'invalid';
      await tx.userTwoFactor.update({
        where: { userId },
        data: { enabledAt: new Date(), recoveryCodeHashes: recoveryHashes },
      });
      await this.audit.append(tx, {
        action: 'auth.two-factor.enabled',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return 'confirmed';
    });
  }
  async findEnabledSecret(userId: string): Promise<string | null> {
    const record = await this.prisma.userTwoFactor.findUnique({
      where: { userId },
      select: { enabledAt: true, encryptedSecret: true },
    });
    return record?.enabledAt ? record.encryptedSecret : null;
  }
  async consumeRecovery(
    userId: string,
    recoveryHash: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const current = await tx.userTwoFactor.findUnique({
        where: { userId },
        select: { recoveryCodeHashes: true },
      });
      const index = current?.recoveryCodeHashes.indexOf(recoveryHash) ?? -1;
      if (!current || index < 0) return false;
      await tx.userTwoFactor.update({
        where: { userId },
        data: {
          recoveryCodeHashes: current.recoveryCodeHashes.filter(
            (_, position) => position !== index,
          ),
        },
      });
      await this.audit.append(tx, {
        action: 'auth.two-factor.recovery-code-used',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return true;
    });
  }
  async findPasswordHash(id: string): Promise<string | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    return record?.passwordHash ?? null;
  }
  async disable(
    userId: string,
    verifyPassword: (passwordHash: string) => Promise<boolean>,
    verifyFactor: (encryptedSecret: string) => boolean,
    recoveryHash: string,
  ): Promise<'disabled' | 'invalid-password' | 'invalid-factor'> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const subject = await tx.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });
      if (!subject || !(await verifyPassword(subject.passwordHash)))
        return 'invalid-password';
      const factor = await tx.userTwoFactor.findUnique({
        where: { userId },
        select: {
          enabledAt: true,
          encryptedSecret: true,
          recoveryCodeHashes: true,
        },
      });
      if (!factor) return 'invalid-factor';
      if (factor.enabledAt && !verifyFactor(factor.encryptedSecret)) {
        if (!factor.recoveryCodeHashes.includes(recoveryHash))
          return 'invalid-factor';
        await this.audit.append(tx, {
          action: 'auth.two-factor.recovery-code-used',
          actorType: 'USER',
          actorId: userId,
          targetType: 'User',
          targetId: userId,
        });
      }
      await tx.userTwoFactor.delete({ where: { userId } });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: { authVersion: { increment: 1 } },
      });
      await this.audit.append(tx, {
        action: 'auth.two-factor.disabled',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return 'disabled';
    });
  }
}
