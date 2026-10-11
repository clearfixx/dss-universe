/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/password-recovery.service.ts
 *
 * 🎯 Purpose:
 * Coordinates non-enumerating recovery requests and credential-confirmed reset.
 *
 * 🧠 Responsibilities:
 * • validates input and applies existing rate limits;
 * • hashes reset credentials and invokes an atomic owned persistence contract;
 * • requests a best-effort security alert only after successful consumption.
 *
 * 🏗️ Architecture:
 * Auth application orchestration; no ORM access or profile dependency.
 *
 * ⚠️ Important:
 * Request responses must not reveal whether an email has an account.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'node:crypto';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordResetRepository,
} from '../../domain/repositories/password-reset.repository.interface';
import { PasswordHashService } from './password-hash.service';
import { SecurityAlertService } from './security-alert.service';

const RATE_LIMIT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n`;

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
    private readonly queues: QueueRegistryService,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resets: PasswordResetRepository,
    private readonly passwords: PasswordHashService,
    private readonly securityAlerts: SecurityAlertService,
  ) {}

  async request(email: string, ip: string): Promise<{ success: boolean }> {
    const normalized = email.trim().toLowerCase();
    // Fail consistently for all addresses when SMTP is not configured.
    if (
      !this.config.get<string>('MAIL_HOST') ||
      !this.config.get<string>('MAIL_FROM') ||
      !this.config.get<string>('PASSWORD_RESET_WEB_URL')
    ) {
      throw new ServiceUnavailableException(
        'Password recovery is temporarily unavailable.',
      );
    }
    const [addressAllowed, clientAllowed] = await Promise.all([
      this.allow('email', normalized, 3),
      this.allow('request-ip', ip, 20),
    ]);
    if (addressAllowed && clientAllowed) {
      // Queue every address, including unknown addresses. No account lookup or
      // SMTP latency is observable through the public request response.
      await this.queues.passwordRecovery.add(
        'password-recovery.v1',
        {
          email: normalized,
          requestedAt: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
    return { success: true };
  }

  async reset(
    token: string,
    password: string,
    ip: string,
  ): Promise<{ success: boolean }> {
    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw new BadRequestException('Invalid reset link or password.');
    }
    const [tokenAllowed, clientAllowed] = await Promise.all([
      this.allow('token', token, 5),
      this.allow('reset-ip', ip, 30),
    ]);
    if (!tokenAllowed || !clientAllowed)
      throw new BadRequestException(
        'Too many attempts. Please try again later.',
      );
    const passwordHash = await this.passwords.hash(password);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const consumed = await this.resets.consume(tokenHash, passwordHash);
    if (!consumed)
      throw new BadRequestException(
        'This reset link is invalid or expired. Request a new link.',
      );
    await this.securityAlerts.notify('PASSWORD_RECOVERED', consumed.email);
    return { success: true };
  }

  private async allow(
    scope: string,
    value: string,
    limit: number,
  ): Promise<boolean> {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const digest = createHmac('sha256', secret)
      .update(`password-recovery:${scope}:${value}`)
      .digest('hex');
    return (
      Number(
        await this.redis.eval(RATE_LIMIT, 1, `dss:recovery:${scope}:${digest}`),
      ) <= limit
    );
  }
}
