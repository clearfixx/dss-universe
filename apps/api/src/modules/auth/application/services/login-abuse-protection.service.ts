/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/login-abuse-protection.service.ts
 *
 * 🎯 Purpose:
 * Coordinates identity/IP throttling and durable login-attempt transitions.
 *
 * 🧠 Responsibilities:
 * • applies configured identity/IP login limits through a private capability;
 * • delegates durable counters and audit to an Auth-owned repository;
 * • sends lock alerts only after a committed transition.
 *
 * 🏗️ Architecture:
 * Auth application orchestration without ORM access or profile dependencies.
 *
 * ⚠️ Important:
 * Missing security infrastructure must not silently permit authentication.
 * Redis counters and SQL writes are not one distributed transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LOGIN_ABUSE_COUNTER,
  type LoginAbuseCounter,
} from '../../domain/contracts/login-abuse-counter.interface';
import {
  LOGIN_ABUSE_REPOSITORY,
  type LoginAbuseRepository,
} from '../../domain/repositories/login-abuse.repository.interface';
import type { AuthClient } from '../types/auth-client.type';
import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';
import { SecurityAlertService } from './security-alert.service';

type LoginAccount = {
  id: string;
  loginFailedAttempts?: number;
  loginLockedUntil?: Date | null;
};

@Injectable()
export class LoginAbuseProtectionService {
  constructor(
    @Inject(LOGIN_ABUSE_COUNTER) private readonly counters: LoginAbuseCounter,
    private readonly config: ConfigService,
    @Inject(LOGIN_ABUSE_REPOSITORY)
    private readonly attempts: LoginAbuseRepository,
    private readonly securityAlerts: SecurityAlertService,
  ) {}

  async assertAllowed(
    email: string,
    ipAddress: string | undefined,
    account?: LoginAccount | null,
  ): Promise<void> {
    const [identityBlocked, ipBlocked] = await Promise.all([
      this.counters.isBlocked('identity', email),
      this.counters.isBlocked('ip', ipAddress ?? 'unknown'),
    ]);
    if (
      identityBlocked ||
      ipBlocked ||
      (account?.loginLockedUntil?.getTime() ?? 0) > Date.now()
    ) {
      throw new LoginRateLimitedException();
    }
  }

  async recordFailure(
    email: string,
    ipAddress: string | undefined,
    account: LoginAccount | null,
    client: AuthClient,
  ): Promise<void> {
    const windowMs = this.number('AUTH_LOGIN_WINDOW_MINUTES', 15) * 60_000;
    const lockMs = this.number('AUTH_LOGIN_LOCK_MINUTES', 15) * 60_000;
    await Promise.all([
      this.counters.recordFailure('identity', email, {
        failureLimit: this.number('AUTH_LOGIN_FAILURE_LIMIT', 5),
        windowMs,
        lockMs,
      }),
      this.counters.recordFailure('ip', ipAddress ?? 'unknown', {
        failureLimit: this.number('AUTH_LOGIN_IP_FAILURE_LIMIT', 30),
        windowMs,
        lockMs,
      }),
    ]);
    if (!account) return;

    const locked = await this.attempts.recordFailure(
      account.id,
      {
        failureLimit: this.number('AUTH_LOGIN_FAILURE_LIMIT', 5),
        lockMs,
      },
      { ipAddress: client.ipAddress, userAgent: client.userAgent },
    );
    if (locked) {
      await this.securityAlerts.notify('ACCOUNT_LOCKED', locked.email);
    }
  }

  async recordSuccess(
    email: string,
    account: LoginAccount,
    client: AuthClient,
  ): Promise<void> {
    await this.counters.clearIdentity(email);
    await this.attempts.recordSuccess(account.id, {
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });
  }

  private number(key: string, fallback: number): number {
    return Number(this.config.get<number>(key) ?? fallback);
  }
}
