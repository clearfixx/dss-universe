/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-account-credentials.repository.ts
 *
 * 🎯 Purpose:
 * Persists credential and account-state transitions without exposing profiles.
 *
 * 🧠 Responsibilities:
 * • guards transitions against current authoritative account state;
 * • atomically invalidates sessions and records attributable audit evidence;
 * • increments access version when credentials change.
 *
 * 🏗️ Architecture:
 * Auth infrastructure adapter over the transitional shared users table.
 * Prisma transaction details stay inside infrastructure.
 *
 * ⚠️ Important:
 * Never return a User record or log password hashes. Failed audit or revocation
 * must roll back the account mutation. Historical audit action names are retained.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { AccountCredentialsRepository } from '../../domain/repositories/account-credentials.repository.interface';

@Injectable()
export class PrismaAccountCredentialsRepository implements AccountCredentialsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async deactivateAccount(subjectId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: subjectId, status: 'ACTIVE' },
        data: {
          status: 'DEACTIVATED',
          deactivatedAt: now,
          refreshTokenHash: null,
        },
        select: { id: true },
      });
      await transaction.session.updateMany({
        where: { userId: subjectId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.append(transaction, {
        action: 'user.account.deactivated',
        actorType: 'USER',
        actorId: subjectId,
        targetType: 'User',
        targetId: subjectId,
      });
    });
  }

  async reactivateAccount(subjectId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: subjectId, status: 'DEACTIVATED' },
        data: { status: 'ACTIVE', deactivatedAt: null, refreshTokenHash: null },
        select: { id: true },
      });
      await this.audit.append(transaction, {
        action: 'user.account.reactivated',
        actorType: 'USER',
        actorId: subjectId,
        targetType: 'User',
        targetId: subjectId,
      });
    });
  }

  changeEmail(subjectId: string, email: string): Promise<void> {
    return this.changeCredentials(
      subjectId,
      {
        email,
        emailVerifiedAt: null,
        authVersion: { increment: 1 },
      },
      'user.account.email_changed',
    );
  }

  changePasswordHash(subjectId: string, passwordHash: string): Promise<void> {
    return this.changeCredentials(
      subjectId,
      {
        passwordHash,
        authVersion: { increment: 1 },
      },
      'user.account.password_changed',
    );
  }

  private async changeCredentials(
    subjectId: string,
    data: Prisma.UserUpdateInput,
    action: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      await transaction.user.update({
        where: { id: subjectId, status: 'ACTIVE' },
        data: { ...data, refreshTokenHash: null },
        select: { id: true },
      });
      await transaction.session.updateMany({
        where: { userId: subjectId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.append(transaction, {
        action,
        actorType: 'USER',
        actorId: subjectId,
        targetType: 'User',
        targetId: subjectId,
      });
    });
  }
}
