/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-auth-session.repository.ts
 *
 * 🎯 Purpose:
 * Persists session lifecycle changes with immutable audit records.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.interface';
import type {
  AuthSession,
  CreateAuthSession,
} from '../../domain/types/auth-session.type';

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  create(input: CreateAuthSession): Promise<AuthSession> {
    return this.prisma.$transaction(async (transaction) => {
      const session = await transaction.session.create({ data: input });
      await this.audit.append(transaction, {
        action: 'auth.session.created',
        actorType: 'USER',
        actorId: input.userId,
        targetType: 'Session',
        targetId: input.id,
      });
      return session;
    });
  }

  findActive(id: string, userId: string): Promise<AuthSession | null> {
    return this.prisma.session.findFirst({
      where: {
        id,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  listActive(userId: string): Promise<AuthSession[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  rotate(
    id: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<AuthSession> {
    return this.prisma.session.update({
      where: { id, userId, revokedAt: null },
      data: { tokenHash, expiresAt },
    });
  }

  async revoke(id: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.session.updateMany({
        where: { id, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count > 0) {
        await this.audit.append(transaction, {
          action: 'auth.session.revoked',
          actorType: 'USER',
          actorId: userId,
          targetType: 'Session',
          targetId: id,
        });
      }
      return result.count > 0;
    });
  }

  async revokeOthers(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.session.updateMany({
        where: {
          userId,
          id: { not: currentSessionId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      await this.audit.append(transaction, {
        action: 'auth.sessions.others_revoked',
        actorType: 'USER',
        actorId: userId,
        targetType: 'Session',
        targetId: currentSessionId,
        metadata: { revokedCount: result.count },
      });
      return result.count;
    });
  }
}

/**
 * 🚪 A revoked session is a closed airlock, not a polite suggestion.
 */
