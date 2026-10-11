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
 * • applies configured login limits and private Redis keys;
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
import { createHmac } from 'node:crypto';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import {
  LOGIN_ABUSE_REPOSITORY,
  type LoginAbuseRepository,
} from '../../domain/repositories/login-abuse.repository.interface';
import type { AuthClient } from '../types/auth-client.type';
import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';
import { SecurityAlertService } from './security-alert.service';

const RECORD_FAILURE = `
local failures = redis.call('INCR', KEYS[1])
if failures == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
if failures >= tonumber(ARGV[2]) then redis.call('SET', KEYS[2], '1', 'PX', ARGV[3]) end
return failures
`;

type LoginAccount = {
  id: string;
  loginFailedAttempts?: number;
  loginLockedUntil?: Date | null;
};

@Injectable()
export class LoginAbuseProtectionService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
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
      this.redis.exists(this.blockedKey('identity', email)),
      this.redis.exists(this.blockedKey('ip', ipAddress ?? 'unknown')),
    ]);
    if (
      identityBlocked === 1 ||
      ipBlocked === 1 ||
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
      this.increment(
        'identity',
        email,
        this.number('AUTH_LOGIN_FAILURE_LIMIT', 5),
        windowMs,
        lockMs,
      ),
      this.increment(
        'ip',
        ipAddress ?? 'unknown',
        this.number('AUTH_LOGIN_IP_FAILURE_LIMIT', 30),
        windowMs,
        lockMs,
      ),
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
    await Promise.all([
      this.redis.del(this.failureKey('identity', email)),
      this.redis.del(this.blockedKey('identity', email)),
    ]);
    await this.attempts.recordSuccess(account.id, {
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });
  }

  private increment(
    scope: 'identity' | 'ip',
    value: string,
    limit: number,
    windowMs: number,
    lockMs: number,
  ) {
    return this.redis.eval(
      RECORD_FAILURE,
      2,
      this.failureKey(scope, value),
      this.blockedKey(scope, value),
      windowMs,
      limit,
      lockMs,
    );
  }

  private failureKey(scope: string, value: string): string {
    return `dss:auth:login:${scope}:failures:${this.digest(scope, value)}`;
  }

  private blockedKey(scope: string, value: string): string {
    return `dss:auth:login:${scope}:blocked:${this.digest(scope, value)}`;
  }

  private digest(scope: string, value: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update(`login:${scope}:${value}`)
      .digest('hex');
  }

  private number(key: string, fallback: number): number {
    return Number(this.config.get<number>(key) ?? fallback);
  }
}
