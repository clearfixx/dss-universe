import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type { AuthClient } from '../types/auth-client.type';
import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';

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
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
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

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${account.id} FOR UPDATE`;
      const current = await tx.user.findUnique({
        where: { id: account.id },
        select: { loginFailedAttempts: true, loginLockedUntil: true },
      });
      if (!current) return;
      const attempts = current.loginFailedAttempts + 1;
      const shouldLock = attempts >= this.number('AUTH_LOGIN_FAILURE_LIMIT', 5);
      const lockedUntil = shouldLock
        ? new Date(Date.now() + lockMs)
        : current.loginLockedUntil;
      await tx.user.update({
        where: { id: account.id },
        data: { loginFailedAttempts: attempts, loginLockedUntil: lockedUntil },
      });
      if (shouldLock && !current.loginLockedUntil) {
        await this.audit.append(tx, {
          action: 'auth.login.locked',
          actorType: 'SYSTEM',
          targetType: 'User',
          targetId: account.id,
          result: 'DENIED',
          reason: 'Repeated invalid login credentials',
          ipAddress: client.ipAddress,
          userAgent: client.userAgent,
          metadata: { attempts, lockMinutes: lockMs / 60_000 },
        });
      }
    });
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
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: account.id },
        data: { loginFailedAttempts: 0, loginLockedUntil: null },
      });
      await this.audit.append(tx, {
        action: 'auth.login.succeeded',
        actorType: 'USER',
        actorId: account.id,
        targetType: 'User',
        targetId: account.id,
        ipAddress: client.ipAddress,
        userAgent: client.userAgent,
      });
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
