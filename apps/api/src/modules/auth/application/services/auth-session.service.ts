/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/auth-session.service.ts
 *
 * 🎯 Purpose:
 * Coordinates creation, rotation, listing and revocation of login sessions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import type { AuthClient } from '../types/auth-client.type';
import {
  AUTH_SESSION_REPOSITORY,
  type AuthSessionRepository,
} from '../../domain/repositories/auth-session.repository.interface';
import type { AuthSession } from '../../domain/types/auth-session.type';

@Injectable()
export class AuthSessionService {
  private static readonly REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepository,
  ) {}

  create(
    id: string,
    userId: string,
    tokenHash: string,
    client: AuthClient,
  ): Promise<AuthSession> {
    return this.sessions.create({
      id,
      userId,
      tokenHash,
      userAgent: client.userAgent?.slice(0, 512),
      ipAddress: client.ipAddress?.slice(0, 64),
      expiresAt: this.expiresAt(),
    });
  }

  findActive(id: string, userId: string): Promise<AuthSession | null> {
    return this.sessions.findActive(id, userId);
  }

  list(userId: string): Promise<AuthSession[]> {
    return this.sessions.listActive(userId);
  }

  rotate(id: string, userId: string, tokenHash: string): Promise<AuthSession> {
    return this.sessions.rotate(id, userId, tokenHash, this.expiresAt());
  }

  revoke(id: string, userId: string): Promise<boolean> {
    return this.sessions.revoke(id, userId);
  }

  revokeOthers(userId: string, currentSessionId: string): Promise<number> {
    return this.sessions.revokeOthers(userId, currentSessionId);
  }

  private expiresAt(): Date {
    return new Date(Date.now() + AuthSessionService.REFRESH_TTL_MS);
  }
}

/**
 * 🧭 Every device gets a trail, and every trail can be closed.
 */
