/**
 * DSS File Passport
 * File: apps/api/src/core/audit/services/audit-writer.service.ts
 * Purpose: Appends immutable, redacted audit records inside business transactions.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import type { AuditEntry } from '../types/audit-entry.type';
import { AuditRedactionService } from './audit-redaction.service';

@Injectable()
export class AuditWriterService {
  constructor(private readonly redaction: AuditRedactionService) {}
  async append(
    transaction: TransactionClient,
    entry: AuditEntry,
  ): Promise<string> {
    const record = await transaction.auditRecord.create({
      data: {
        action: entry.action,
        actorType: entry.actorType,
        actorId: entry.actorId,
        targetType: entry.targetType,
        targetId: entry.targetId,
        result: entry.result ?? 'SUCCESS',
        reason: entry.reason,
        correlationId: entry.correlationId,
        requestId: entry.requestId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata
          ? (this.redaction.redact(entry.metadata) as Prisma.InputJsonValue)
          : undefined,
        occurredAt: entry.occurredAt ? new Date(entry.occurredAt) : undefined,
      },
      select: { id: true },
    });
    return record.id;
  }
}
