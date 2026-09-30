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
import { PrismaPasswordResetRepository } from '../../infrastructure/repositories/prisma-password-reset.repository';
import { PasswordHashService } from './password-hash.service';

const RATE_LIMIT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n`;

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
    private readonly queues: QueueRegistryService,
    private readonly resets: PrismaPasswordResetRepository,
    private readonly passwords: PasswordHashService,
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
    const consumed = await this.resets.consume(
      createHash('sha256').update(token).digest('hex'),
      passwordHash,
    );
    if (!consumed)
      throw new BadRequestException(
        'This reset link is invalid or expired. Request a new link.',
      );
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
