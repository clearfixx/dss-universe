/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure/repositories/prisma-title-grant.writer.ts
 *
 * 🎯 Purpose:
 * Persists title grants while root supplies transaction-local recipient existence.
 *
 * 🧠 Responsibilities:
 * • keeps the pair lock and parallel recipient/title/existing stage;
 * • preserves result precedence, owned grant mapping and atomic evidence.
 *
 * 🏗️ Architecture:
 * Stateless owner writer; infrastructure-only callback carries no profile facts.
 *
 * ⚠️ Important:
 * No foreign table reads, transaction lifetime or account eligibility policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import type { TransactionClient } from '@api/core/database';
import { OutboxWriterService } from '@api/core/events';
import type { GrantCustomTitle } from '../../contracts/title-grant-transaction.port';
import type { TitleGrantResult } from '../../domain/types/custom-titles.type';
import { grantInclude, toTitleGrant } from './title-grant.shape';
import { TitleEvidenceWriter } from './title-evidence.writer';

@Injectable()
export class PrismaTitleGrantWriter {
  private readonly evidence: TitleEvidenceWriter;
  constructor(audit: AuditWriterService, outbox: OutboxWriterService) {
    this.evidence = new TitleEvidenceWriter(audit, outbox);
  }
  async grant(
    transaction: TransactionClient,
    input: GrantCustomTitle,
    recipientExists: () => Promise<boolean>,
  ): Promise<TitleGrantResult> {
    const { userId, titleId, reason, actorId } = input;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`custom-titles:grant:${userId}:${titleId}`}, 0))`;
    const [user, title, existing] = await Promise.all([
      recipientExists(),
      transaction.customTitle.findFirst({
        where: { id: titleId, isActive: true },
        select: { id: true },
      }),
      transaction.userTitleGrant.findFirst({
        where: { userId, titleId, revokedAt: null },
        select: { id: true },
      }),
    ]);
    if (!user) return { status: 'USER_NOT_FOUND', grant: null };
    if (!title) return { status: 'TITLE_NOT_FOUND', grant: null };
    if (existing) return { status: 'CONFLICT', grant: null };
    const grant = await transaction.userTitleGrant.create({
      data: { userId, titleId, grantedById: actorId, grantReason: reason },
      include: grantInclude,
    });
    await this.evidence.record(
      transaction,
      'granted',
      actorId,
      'UserTitleGrant',
      grant.id,
      { userId, titleId, grantId: grant.id, reason },
    );
    return { status: 'OK', grant: toTitleGrant(grant) };
  }
}
