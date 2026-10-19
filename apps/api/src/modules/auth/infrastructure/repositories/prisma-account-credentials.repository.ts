/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-account-credentials.repository.ts
 *
 * 🎯 Purpose:
 * Reads and persists Auth credential/state data without exposing profiles.
 *
 * 🧠 Responsibilities:
 * • selects only Auth-owned credential, eligibility and abuse-state fields;
 * • guards transitions against current authoritative account state;
 * • atomically invalidates sessions and records attributable audit evidence;
 * • increments access version when credentials change.
 * • invalidates obsolete verification proof when the email destination changes.
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
import type { AccountCredentials } from '../../domain/types/account-credentials.type';

@Injectable()
export class PrismaAccountCredentialsRepository implements AccountCredentialsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  findById(subjectId: string): Promise<AccountCredentials | null> {
    return this.findCredentials({ id: subjectId });
  }

  findByEmail(email: string): Promise<AccountCredentials | null> {
    return this.findCredentials({ email });
  }

  private async findCredentials(
    where: { id: string } | { email: string },
  ): Promise<AccountCredentials | null> {
    const account = await this.prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        authVersion: true,
        loginFailedAttempts: true,
        loginLockedUntil: true,
      },
    });
    if (!account) return null;
    return {
      id: account.id,
      email: account.email,
      passwordHash: account.passwordHash,
      status: account.status,
      authVersion: account.authVersion,
      loginFailedAttempts: account.loginFailedAttempts,
      loginLockedUntil: account.loginLockedUntil,
    };
  }

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
      true,
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
      false,
    );
  }

  private async changeCredentials(
    subjectId: string,
    data: Prisma.UserUpdateInput,
    action: string,
    invalidateEmailVerification: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      await transaction.user.update({
        where: { id: subjectId, status: 'ACTIVE' },
        data: { ...data, refreshTokenHash: null },
        select: { id: true },
      });
      // UPDATE holds the subject row lock also used by issuance and consume.
      // Old destination proof must disappear before that lock is released.
      if (invalidateEmailVerification) {
        await transaction.emailVerification.deleteMany({
          where: { userId: subjectId },
        });
      }
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
