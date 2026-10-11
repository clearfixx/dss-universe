/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/email-verification.service.ts
 *
 * 🎯 Purpose:
 * Coordinates verification requests and single-use credential consumption.
 *
 * 🧠 Responsibilities:
 * • applies mail availability and resend limits;
 * • queues credential-free delivery requests;
 * • delegates authoritative verification to an Auth-owned port.
 *
 * 🏗️ Architecture:
 * Application service; persistence is private to the infrastructure adapter.
 *
 * ⚠️ Important:
 * Never return tokens, destinations or account existence through public responses.
 * Registration mail failure must not roll back account creation.
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
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '../../domain/repositories/email-verification.repository.interface';

const RATE_LIMIT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n`;

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
    private readonly queues: QueueRegistryService,
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly credentials: EmailVerificationRepository,
  ) {}

  async request(userId: string, ip: string): Promise<{ success: boolean }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email verification is temporarily unavailable.',
      );
    }
    const destination = await this.credentials.findPendingDestination(userId);
    if (!destination) {
      return { success: true };
    }
    const [accountAllowed, clientAllowed] = await Promise.all([
      this.allow('user', userId, 3),
      this.allow('ip', ip, 20),
    ]);
    if (accountAllowed && clientAllowed) {
      await this.enqueue(userId, destination.email);
    }
    return { success: true };
  }

  async requestAfterRegistration(userId: string, email: string): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.enqueue(userId, email);
    } catch {
      // Account creation must remain successful when asynchronous mail
      // infrastructure is temporarily unavailable. The user can resend later.
    }
  }

  async verify(token: string): Promise<{ success: boolean }> {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
    const consumed = await this.credentials.consume(
      createHash('sha256').update(token).digest('hex'),
    );
    if (!consumed) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
    return { success: true };
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('MAIL_HOST') &&
      this.config.get<string>('MAIL_FROM') &&
      this.config.get<string>('EMAIL_VERIFICATION_WEB_URL'),
    );
  }

  private async enqueue(userId: string, email: string): Promise<void> {
    await this.queues.emailVerification.add(
      'email-verification.v1',
      { userId, email, requestedAt: new Date().toISOString() },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  private async allow(scope: string, value: string, limit: number) {
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
