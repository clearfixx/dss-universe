/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure/repositories/title-evidence.writer.ts
 *
 * 🎯 Purpose:
 * Retains the single owned audit/outbox algorithm for title lifecycle evidence.
 *
 * 🧠 Responsibilities:
 * • preserves title event envelopes and actor metadata;
 * • appends audit before outbox using the caller's transaction.
 *
 * 🏗️ Architecture:
 * Owner-local stateless helper reused by repository and grant writer; not a root export.
 *
 * ⚠️ Important:
 * No transaction lifetime, retries or profile reads belong here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { AuditWriterService } from '@api/core/audit';
import type { TransactionClient } from '@api/core/database';
import {
  createEventEnvelope,
  type JsonValue,
  OutboxWriterService,
} from '@api/core/events';

export class TitleEvidenceWriter {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}
  async record(
    transaction: TransactionClient,
    action: string,
    actorId: string,
    targetType: string,
    targetId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const jsonPayload = payload as JsonValue;
    await this.audit.append(transaction, {
      action: `custom-titles.${action}`,
      actorType: 'USER',
      actorId,
      targetType,
      targetId,
      metadata: jsonPayload,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `custom-titles.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: 'dss.api.custom-titles',
        aggregate: { type: targetType, id: targetId },
        actorId,
        payload: jsonPayload,
      }),
    );
  }
}
