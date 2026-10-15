/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/achievement-evidence.writer.ts
 *
 * 🎯 Purpose:
 * Retains the single owned audit/outbox algorithm for achievement lifecycle evidence.
 *
 * 🧠 Responsibilities:
 * • builds existing award payloads and event envelopes;
 * • appends audit before outbox using the caller's transaction.
 *
 * 🏗️ Architecture:
 * Owner-local stateless helper, reused by repository and manual writer; not a root export.
 *
 * ⚠️ Important:
 * Preserve actor omission, producer, category, version and payload keys.
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
import type { AwardRow } from './achievement-award.shape';

export const ACHIEVEMENTS_PRODUCER = 'dss.api.achievements';
export class AchievementEvidenceWriter {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}
  recordAward(
    transaction: TransactionClient,
    action: 'awarded' | 'revoked',
    actorId: string | null,
    award: AwardRow,
  ): Promise<void> {
    return this.record(
      transaction,
      `award.${action}`,
      actorId,
      'AchievementAward',
      award.id,
      {
        awardId: award.id,
        userId: award.userId,
        achievementId: award.achievementId,
        kind: award.kind,
        sourceType: award.sourceType,
        sourceId: award.sourceId,
      },
    );
  }
  async record(
    transaction: TransactionClient,
    action: string,
    actorId: string | null,
    targetType: string,
    targetId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const jsonPayload = payload as JsonValue;
    await this.audit.append(transaction, {
      action: `achievements.${action}`,
      actorType: actorId ? 'USER' : 'SYSTEM',
      ...(actorId ? { actorId } : {}),
      targetType,
      targetId,
      metadata: jsonPayload,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `achievements.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: ACHIEVEMENTS_PRODUCER,
        aggregate: { type: targetType, id: targetId },
        ...(actorId ? { actorId } : {}),
        payload: jsonPayload,
      }),
    );
  }
}
