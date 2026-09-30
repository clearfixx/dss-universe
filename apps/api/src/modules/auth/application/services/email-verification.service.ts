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
import { PrismaService } from '@api/core/database';
import { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import { PrismaEmailVerificationRepository } from '../../infrastructure/repositories/prisma-email-verification.repository';

const RATE_LIMIT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n`;

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly queues: QueueRegistryService,
    private readonly credentials: PrismaEmailVerificationRepository,
  ) {}

  async request(userId: string, ip: string): Promise<{ success: boolean }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email verification is temporarily unavailable.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE' || user.emailVerifiedAt) {
      return { success: true };
    }
    const [accountAllowed, clientAllowed] = await Promise.all([
      this.allow('user', userId, 3),
      this.allow('ip', ip, 20),
    ]);
    if (accountAllowed && clientAllowed) {
      await this.enqueue(userId, user.email);
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
