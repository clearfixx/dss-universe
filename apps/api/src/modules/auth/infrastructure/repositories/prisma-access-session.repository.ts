/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-access-session.repository.ts
 *
 * 🎯 Purpose:
 * Reads authoritative session eligibility without exposing User or Session ORM records.
 *
 * 🧠 Responsibilities:
 * • selects only subject binding, revocation, expiry and account access state;
 * • maps shared-table persistence into an authentication-owned contract.
 *
 * 🏗️ Architecture:
 * Auth infrastructure adapter; Prisma and the transitional User relation stay here.
 *
 * ⚠️ Important:
 * Never fetch or return password/token hashes, profile fields or authorization grants.
 * Account status is translated to eligibility rather than exported as an ORM enum.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '@api/core/database';

import type { AccessSessionRepository } from '../../domain/repositories/access-session.repository.interface';
import type { AccessSessionState } from '../../domain/types/access-session-state.type';

@Injectable()
export class PrismaAccessSessionRepository implements AccessSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(sessionId: string): Promise<AccessSessionState | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { status: true, authVersion: true } },
      },
    });
    if (!session) return null;
    return {
      subjectId: session.userId,
      revokedAt: session.revokedAt,
      expiresAt: session.expiresAt,
      accountActive: session.user.status === UserStatus.ACTIVE,
      authVersion: session.user.authVersion,
    };
  }
}
