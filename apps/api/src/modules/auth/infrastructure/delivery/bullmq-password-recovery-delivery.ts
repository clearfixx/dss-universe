/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/delivery/bullmq-password-recovery-delivery.ts
 *
 * 🎯 Purpose:
 * Adapts the private Auth delivery capability to the existing BullMQ queue.
 *
 * 🧠 Responsibilities:
 * • allowlists the delivery payload;
 * • preserves job version, retry and cleanup policy;
 * • propagates enqueue errors to application policy.
 *
 * 🏗️ Architecture:
 * Private infrastructure adapter; application services never receive the registry.
 *
 * ⚠️ Important:
 * Enqueue does not prove SMTP delivery. Never copy arbitrary credential fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { PasswordRecoveryJob } from '@dss/jobs';
import { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import type { PasswordRecoveryDelivery } from '../../domain/contracts/password-recovery-delivery.interface';

@Injectable()
export class BullmqPasswordRecoveryDelivery implements PasswordRecoveryDelivery {
  constructor(private readonly queues: QueueRegistryService) {}

  async enqueue(request: Readonly<PasswordRecoveryJob>): Promise<void> {
    await this.queues.passwordRecovery.add(
      'password-recovery.v1',
      {
        email: request.email,
        requestedAt: request.requestedAt,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
