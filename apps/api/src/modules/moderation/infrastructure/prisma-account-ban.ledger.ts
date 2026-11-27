/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/infrastructure/prisma-account-ban.ledger.ts
 *
 * 🎯 Purpose:
 * Moderation-owned ban rows with their audit and Outbox records.
 *
 * ⚠️ Important:
 * Writes run inside the caller's transaction. Rows are never deleted.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { AccountBan, Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type {
  AccountBanRecord,
  NewAccountBan,
} from '../domain/types/account-ban.type';

const PRODUCER = 'dss.api.moderation';

export function accountBanRecord(row: AccountBan): AccountBanRecord {
  return {
    id: row.id,
    reference: row.reference,
    subjectId: row.subjectId,
    issuerId: row.issuerId,
    ruleCode: row.ruleCode,
    ruleText: row.ruleText,
    comment: row.comment,
    contextPath: row.contextPath,
    issuedAt: row.issuedAt,
    liftedAt: row.liftedAt,
    liftedById: row.liftedById,
    liftReason: row.liftReason,
  };
}

@Injectable()
export class PrismaAccountBanLedger {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async create(
    tx: Prisma.TransactionClient,
    ban: NewAccountBan,
    previousStatus: 'ACTIVE' | 'DEACTIVATED',
  ): Promise<AccountBanRecord> {
    const { context, ...facts } = ban;
    const row = await tx.accountBan.create({
      data: {
        ...facts,
        contextType: context?.type ?? null,
        contextId: context?.id ?? null,
        contextPath: context?.path ?? null,
        previousStatus,
      },
    });
    await this.record(tx, ban.issuerId, 'issued', row);
    return accountBanRecord(row);
  }

  async markLifted(
    tx: Prisma.TransactionClient,
    banId: string,
    actorId: string,
    reason: string,
  ): Promise<{
    record: AccountBanRecord;
    previousStatus: 'ACTIVE' | 'DEACTIVATED';
  } | null> {
    const changed = await tx.accountBan.updateMany({
      where: { id: banId, liftedAt: null },
      data: { liftedAt: new Date(), liftedById: actorId, liftReason: reason },
    });
    if (changed.count !== 1) return null;
    const row = await tx.accountBan.findUniqueOrThrow({
      where: { id: banId },
    });
    await this.record(tx, actorId, 'lifted', row);
    return {
      record: accountBanRecord(row),
      previousStatus:
        row.previousStatus === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE',
    };
  }

  private async record(
    tx: Prisma.TransactionClient,
    actorId: string,
    verb: 'issued' | 'lifted',
    row: AccountBan,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: `moderation.ban_${verb}`,
      actorType: 'USER',
      actorId,
      targetType: 'AccountBan',
      targetId: row.id,
      metadata: { reference: row.reference, subjectId: row.subjectId },
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `moderation.ban.${verb}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'AccountBan', id: row.id },
        payload: { subjectId: row.subjectId, ruleCode: row.ruleCode },
      }),
    );
  }
}
