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
import { createHash } from 'node:crypto';
import {
  VERIFICATION_RATE_LIMIT,
  type VerificationRateLimit,
} from '../../domain/contracts/verification-rate-limit.interface';
import {
  EMAIL_VERIFICATION_DELIVERY,
  type EmailVerificationDelivery,
} from '../../domain/contracts/email-verification-delivery.interface';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '../../domain/repositories/email-verification.repository.interface';

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(VERIFICATION_RATE_LIMIT)
    private readonly limits: VerificationRateLimit,
    private readonly config: ConfigService,
    @Inject(EMAIL_VERIFICATION_DELIVERY)
    private readonly delivery: EmailVerificationDelivery,
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
      this.limits.allow('user', userId, 3),
      this.limits.allow('ip', ip, 20),
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
    await this.delivery.enqueue({
      userId,
      email,
      requestedAt: new Date().toISOString(),
    });
  }
}
