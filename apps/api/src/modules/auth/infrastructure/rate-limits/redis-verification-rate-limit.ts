/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/rate-limits/redis-verification-rate-limit.ts
 *
 * 🎯 Purpose:
 * Preserves private keyed attempt counters behind the Auth-owned capability.
 *
 * 🧠 Responsibilities:
 * • derives compatible HMAC keys without exposing raw identity values;
 * • increments and sets first-use expiry atomically;
 * • propagates infrastructure failures for fail-closed handling.
 *
 * 🏗️ Architecture:
 * Private Redis adapter; policy limits remain in the application.
 *
 * ⚠️ Important:
 * Preserve key namespace and fixed 900-second window, not sliding expiry.
 * Never log raw input or fall back to allowing requests on Redis failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import type { VerificationRateLimit } from '../../domain/contracts/verification-rate-limit.interface';

const RATE_LIMIT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n`;

@Injectable()
export class RedisVerificationRateLimit implements VerificationRateLimit {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
  ) {}
  async allow(
    scope: Parameters<VerificationRateLimit['allow']>[0],
    value: string,
    limit: number,
  ): Promise<boolean> {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const digest = createHmac('sha256', secret)
      .update(`email-verification:${scope}:${value}`)
      .digest('hex');
    return (
      Number(
        await this.redis.eval(
          RATE_LIMIT,
          1,
          `dss:email-verification:${scope}:${digest}`,
        ),
      ) <= limit
    );
  }
}
