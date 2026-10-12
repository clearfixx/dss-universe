/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/security-alert.service.ts
 *
 * 🎯 Purpose:
 * Requests best-effort notification after committed security operations.
 *
 * 🧠 Responsibilities:
 * • creates event identity and normalized destination;
 * • delegates only the allowlisted alert payload;
 * • isolates already committed operations from mail transport failure.
 *
 * 🏗️ Architecture:
 * Application orchestration through a private Auth delivery contract.
 *
 * ⚠️ Important:
 * Best effort is not an Outbox guarantee. Never attach credential secrets.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SecurityAlertKind } from '@dss/jobs';
import {
  SECURITY_ALERT_DELIVERY,
  type SecurityAlertDelivery,
} from '../../domain/contracts/security-alert-delivery.interface';

@Injectable()
export class SecurityAlertService {
  constructor(
    @Inject(SECURITY_ALERT_DELIVERY)
    private readonly delivery: SecurityAlertDelivery,
  ) {}

  async notify(kind: SecurityAlertKind, email: string): Promise<void> {
    const eventId = randomUUID();
    try {
      await this.delivery.enqueue({
        eventId,
        kind,
        email: email.trim().toLowerCase(),
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // The credential change is already committed. Mail transport must not
      // turn a successful security operation into a misleading API failure.
    }
  }
}
