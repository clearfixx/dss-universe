/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/infrastructure/prisma-ban-appeal.ledger.ts
 *
 * 🎯 Purpose:
 * Moderation-owned appeal and screenshot rows with audit and Outbox records.
 *
 * ⚠️ Important:
 * Writes run inside the caller's transaction. `lock` must come first: it
 * serializes every command about one ban.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { BanAppeal, Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  canAddAppealFile,
  type BanAppealRecord,
  type BanAppealStatus,
} from '../domain/ban-appeal.rules';

const PRODUCER = 'dss.api.moderation';

export function banAppealRecord(row: BanAppeal): BanAppealRecord {
  return {
    id: row.id,
    banId: row.banId,
    text: row.text,
    status: row.status as BanAppealStatus,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt,
    decidedById: row.decidedById,
    decisionReason: row.decisionReason,
  };
}

@Injectable()
export class PrismaBanAppealLedger {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async lock(tx: Prisma.TransactionClient, banId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ban-appeal:${banId}`}))`;
  }

  /** True while the ban is in force and its appeal was not sent yet. */
  async isOpen(tx: Prisma.TransactionClient, banId: string): Promise<boolean> {
    const ban = await tx.accountBan.findUnique({
      where: { id: banId },
      select: { liftedAt: true, appeal: { select: { id: true } } },
    });
    return !!ban && !ban.liftedAt && !ban.appeal;
  }

  /** The attached media ids after adding, or null when it is not allowed. */
  async addFile(
    tx: Prisma.TransactionClient,
    banId: string,
    mediaId: string,
  ): Promise<string[] | null> {
    if (!(await this.isOpen(tx, banId))) return null;
    const files = await tx.banAppealFile.findMany({
      where: { banId },
      select: { mediaId: true, removedAt: true },
    });
    const attached = files.filter((file) => !file.removedAt);
    if (!canAddAppealFile(attached.length, files.length)) return null;
    await tx.banAppealFile.create({ data: { banId, mediaId } });
    return [...attached.map((file) => file.mediaId), mediaId];
  }

  /** The attached media ids after removing, or null when it is not allowed. */
  async removeFile(
    tx: Prisma.TransactionClient,
    banId: string,
    fileId: string,
  ): Promise<string[] | null> {
    if (!(await this.isOpen(tx, banId))) return null;
    const changed = await tx.banAppealFile.updateMany({
      where: { id: fileId, banId, removedAt: null },
      data: { removedAt: new Date() },
    });
    if (changed.count !== 1) return null;
    const attached = await tx.banAppealFile.findMany({
      where: { banId, removedAt: null },
      select: { mediaId: true },
    });
    return attached.map((file) => file.mediaId);
  }

  async create(
    tx: Prisma.TransactionClient,
    banId: string,
    text: string,
  ): Promise<BanAppealRecord | null> {
    if (!(await this.isOpen(tx, banId))) return null;
    const row = await tx.banAppeal.create({ data: { banId, text } });
    const ban = await tx.accountBan.findUniqueOrThrow({
      where: { id: banId },
      select: { subjectId: true },
    });
    await this.record(tx, ban.subjectId, 'submitted', row);
    return banAppealRecord(row);
  }

  async decide(
    tx: Prisma.TransactionClient,
    appealId: string,
    actorId: string,
    accept: boolean,
    reason: string,
  ): Promise<BanAppealRecord | null> {
    const changed = await tx.banAppeal.updateMany({
      where: { id: appealId, status: 'PENDING', ban: { liftedAt: null } },
      data: {
        status: accept ? 'ACCEPTED' : 'REJECTED',
        decidedAt: new Date(),
        decidedById: actorId,
        decisionReason: reason,
      },
    });
    if (changed.count !== 1) return null;
    const row = await tx.banAppeal.findUniqueOrThrow({
      where: { id: appealId },
    });
    await this.record(tx, actorId, accept ? 'accepted' : 'rejected', row);
    return banAppealRecord(row);
  }

  private async record(
    tx: Prisma.TransactionClient,
    actorId: string,
    verb: 'submitted' | 'accepted' | 'rejected',
    row: BanAppeal,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: `moderation.ban_appeal_${verb}`,
      actorType: 'USER',
      actorId,
      targetType: 'BanAppeal',
      targetId: row.id,
      metadata: { banId: row.banId },
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `moderation.ban_appeal.${verb}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'BanAppeal', id: row.id },
        payload: { banId: row.banId },
      }),
    );
  }
}
