/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/rate-limits/redis-login-abuse-counter.ts
 *
 * 🎯 Purpose:
 * Preserves Redis login-attempt accounting behind the Auth-owned capability.
 *
 * 🧠 Responsibilities:
 * • derives compatible private identity/IP keys;
 * • records failures atomically with fixed counter expiry and renewable locks;
 * • clears only identity counters after successful authentication.
 *
 * 🏗️ Architecture:
 * Private infrastructure adapter. Application owns thresholds and SQL ordering.
 *
 * ⚠️ Important:
 * Infrastructure failure propagates. Redis and SQL are separate transactions.
 * Repeated failures at or above the threshold renew the block, not the counter TTL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import type { LoginAbuseCounter } from '../../domain/contracts/login-abuse-counter.interface';

const RECORD_FAILURE = `
local failures = redis.call('INCR', KEYS[1])
if failures == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
if failures >= tonumber(ARGV[2]) then redis.call('SET', KEYS[2], '1', 'PX', ARGV[3]) end
return failures
`;

@Injectable()
export class RedisLoginAbuseCounter implements LoginAbuseCounter {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
  ) {}

  async isBlocked(scope: 'identity' | 'ip', value: string): Promise<boolean> {
    return (await this.redis.exists(this.blockedKey(scope, value))) === 1;
  }

  async recordFailure(
    scope: 'identity' | 'ip',
    value: string,
    policy: Readonly<{
      failureLimit: number;
      windowMs: number;
      lockMs: number;
    }>,
  ): Promise<void> {
    await this.redis.eval(
      RECORD_FAILURE,
      2,
      this.failureKey(scope, value),
      this.blockedKey(scope, value),
      policy.windowMs,
      policy.failureLimit,
      policy.lockMs,
    );
  }

  async clearIdentity(email: string): Promise<void> {
    await Promise.all([
      this.redis.del(this.failureKey('identity', email)),
      this.redis.del(this.blockedKey('identity', email)),
    ]);
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
}
