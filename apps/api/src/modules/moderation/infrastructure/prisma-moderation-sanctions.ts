/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/infrastructure/prisma-moderation-sanctions.ts
 *
 * 🎯 Purpose:
 * Implements the M-0 sanctions journal: warnings, temporary read-only,
 * automatic escalation, revocation, policy and journal reads.
 *
 * ⚠️ Important:
 * Every write serializes per subject with a transaction-scoped advisory lock and
 * appends audit and Outbox evidence in the same transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type ModerationSanction } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  Permission,
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from '@api/core/authorization';
import type {
  IssueReadOnlyCommand,
  IssueWarningCommand,
  ModerationActor,
  RevokeSanctionCommand,
  SanctionContextInput,
  UpdateSanctionPolicyCommand,
} from '../application/moderation-sanctions.commands';
import type {
  IssuedSanctionReceipt,
  SanctionIssuer,
  ScopedSanctionCommand,
} from '../contracts/sanction-issuer.contract';
import type { SanctionStateReader } from '../contracts/sanction-state-reader.contract';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import {
  addDays,
  DEFAULT_MODERATION_SANCTION_POLICY,
  isSanctionActive,
  normalizeSanctionContext,
  normalizeSanctionReason,
  readOnlyExpiry,
  shouldEscalate,
  validateSanctionPolicy,
} from '../domain/moderation-sanction.rules';
import type {
  ModerationJournalPage,
  ModerationSanctionContext,
  ModerationSanctionKind,
  ModerationSanctionOrigin,
  ModerationSanctionPolicy,
  ModerationSanctionRecord,
  ModerationSanctionStatus,
} from '../domain/types/moderation-sanction.type';

const PRODUCER = 'dss.api.moderation';
const POLICY_ID = 'default';
const MAX_PAGE_SIZE = 50;

/** Permissions that make a subject "staff" for sanction protection. */
const SANCTIONING_PERMISSIONS: readonly string[] = [
  Permission.ModerationWarningsIssue,
  Permission.ModerationReadOnlyIssue,
  Permission.ModerationSanctionsRevoke,
];

type IssueInput = {
  actorId: string;
  subjectId: string;
  kind: ModerationSanctionKind;
  origin: Exclude<ModerationSanctionOrigin, 'ESCALATION'>;
  reason: string;
  context: ModerationSanctionContext | null;
  readOnlyUntil: Date | null;
};

@Injectable()
export class ModerationSanctionsService
  implements SanctionIssuer, SanctionStateReader
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(SUBJECT_ACCESS_READER)
    private readonly subjects: SubjectAccessReader,
  ) {}

  async issueWarning(
    actor: ModerationActor,
    command: IssueWarningCommand,
  ): Promise<IssuedSanctionReceipt> {
    this.require(actor, Permission.ModerationWarningsIssue);
    return await this.issue(
      {
        actorId: actor.id,
        subjectId: command.subjectId,
        kind: 'WARNING',
        origin: 'MANUAL',
        reason: normalizeSanctionReason(command.reason),
        context: this.context(command.context),
        readOnlyUntil: null,
      },
      actor.permissions,
    );
  }

  async issueReadOnly(
    actor: ModerationActor,
    command: IssueReadOnlyCommand,
  ): Promise<IssuedSanctionReceipt> {
    this.require(actor, Permission.ModerationReadOnlyIssue);
    return await this.issue(
      {
        actorId: actor.id,
        subjectId: command.subjectId,
        kind: 'READ_ONLY',
        origin: 'MANUAL',
        reason: normalizeSanctionReason(command.reason),
        context: this.context(command.context),
        readOnlyUntil: command.expiresAt,
      },
      actor.permissions,
    );
  }

  async issueScoped(
    command: ScopedSanctionCommand,
  ): Promise<IssuedSanctionReceipt> {
    const actor = await this.subjects.getAccessProfileByUserId(command.actorId);
    const context = this.context(command.context);
    if (!context) {
      throw new ModerationSanctionError(
        'INVALID_INPUT',
        'Scoped sanctions require the owner context.',
      );
    }
    return this.issue(
      {
        actorId: command.actorId,
        subjectId: command.subjectId,
        kind: command.kind,
        origin: 'SCOPED',
        reason: normalizeSanctionReason(command.reason),
        context,
        readOnlyUntil: command.readOnlyUntil ?? null,
      },
      actor.permissions,
    );
  }

  async revoke(
    actor: ModerationActor,
    command: RevokeSanctionCommand,
  ): Promise<ModerationSanctionRecord> {
    this.require(actor, Permission.ModerationSanctionsRevoke);
    const reason = normalizeSanctionReason(command.reason, 'Revocation reason');
    const located = await this.prisma.moderationSanction.findUnique({
      where: { id: command.sanctionId },
      select: { subjectId: true },
    });
    if (!located) this.notFound();
    await this.requireSubjectAuthority(
      actor.id,
      located.subjectId,
      actor.permissions,
    );
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await this.lockSubject(tx, located.subjectId);
      const current = await tx.moderationSanction.findUnique({
        where: { id: command.sanctionId },
      });
      if (!current) this.notFound();
      if (!isSanctionActive(current, now)) {
        throw new ModerationSanctionError(
          'INVALID_STATE',
          'Only an active sanction can be revoked.',
        );
      }
      const revoked = await tx.moderationSanction.update({
        where: { id: current.id },
        data: { revokedAt: now, revokedById: actor.id, revokeReason: reason },
      });
      await this.record(tx, actor.id, 'USER', revoked, 'revoked', reason);
      return this.toRecord(revoked);
    });
  }

  async status(
    subjectId: string,
    at = new Date(),
  ): Promise<ModerationSanctionStatus> {
    const [readOnly, activeWarnings] = await Promise.all([
      this.readOnlyUntil(subjectId, at),
      this.prisma.moderationSanction.count({
        where: {
          subjectId,
          kind: 'WARNING',
          ...this.activeWhere(at),
          consumedAt: null,
        },
      }),
    ]);
    return { readOnlyUntil: readOnly, activeWarnings };
  }

  async readOnlyUntil(subjectId: string, at: Date): Promise<Date | null> {
    const latest = await this.prisma.moderationSanction.findFirst({
      where: { subjectId, kind: 'READ_ONLY', ...this.activeWhere(at) },
      orderBy: { expiresAt: 'desc' },
      select: { expiresAt: true },
    });
    return latest?.expiresAt ?? null;
  }

  async journal(
    subjectId: string,
    page: number,
    limit: number,
  ): Promise<ModerationJournalPage> {
    const safePage = Math.max(1, Math.trunc(page) || 1);
    const safeLimit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(limit) || 20),
    );
    const [rows, total] = await Promise.all([
      this.prisma.moderationSanction.findMany({
        where: { subjectId },
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.moderationSanction.count({ where: { subjectId } }),
    ]);
    return {
      items: rows.map((row) => this.toRecord(row)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async journalForStaff(
    actor: ModerationActor,
    subjectId: string,
    page: number,
    limit: number,
  ): Promise<ModerationJournalPage> {
    this.require(actor, Permission.ModerationSanctionsView);
    return this.journal(subjectId, page, limit);
  }

  /**
   * Staff sanctions journal across members (P1 B09), newest first.
   * Optional filters: one member, one kind, active sanctions only.
   */
  async listForStaff(
    actor: ModerationActor,
    filter: {
      subjectId: string | null;
      kind: ModerationSanctionKind | null;
      activeOnly: boolean;
    },
    page: number,
    limit: number,
    at = new Date(),
  ): Promise<ModerationJournalPage> {
    this.require(actor, Permission.ModerationSanctionsView);
    const safePage = Math.max(1, Math.trunc(page) || 1);
    const safeLimit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(limit) || 20),
    );
    const where = {
      ...(filter.subjectId ? { subjectId: filter.subjectId } : {}),
      ...(filter.kind ? { kind: filter.kind } : {}),
      ...(filter.activeOnly ? this.activeWhere(at) : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.moderationSanction.findMany({
        where,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.moderationSanction.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toRecord(row)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async policy(): Promise<ModerationSanctionPolicy> {
    return this.readPolicy(this.prisma);
  }

  async updatePolicy(
    actor: ModerationActor,
    command: UpdateSanctionPolicyCommand,
  ): Promise<ModerationSanctionPolicy> {
    this.require(actor, Permission.ModerationPolicyManage);
    const next: ModerationSanctionPolicy = {
      warningLifetimeDays: command.warningLifetimeDays,
      escalationWarningCount: command.escalationWarningCount,
      escalationReadOnlyDays: command.escalationReadOnlyDays,
      readOnlyMaxDays: command.readOnlyMaxDays,
    };
    validateSanctionPolicy(next);
    return this.prisma.$transaction(async (tx) => {
      const previous = await this.readPolicy(tx);
      await tx.moderationSanctionPolicy.upsert({
        where: { id: POLICY_ID },
        create: { id: POLICY_ID, ...next, updatedById: actor.id },
        update: { ...next, updatedById: actor.id },
      });
      await this.audit.append(tx, {
        action: 'moderation.policy_updated',
        actorType: 'USER',
        actorId: actor.id,
        targetType: 'ModerationSanctionPolicy',
        targetId: POLICY_ID,
        metadata: { previous, next },
      });
      await this.outbox.append(
        tx,
        createEventEnvelope({
          name: 'moderation.policy.updated.v1',
          version: 1,
          category: 'integration',
          producer: PRODUCER,
          actorId: actor.id,
          aggregate: { type: 'ModerationSanctionPolicy', id: POLICY_ID },
          payload: next,
        }),
      );
      return next;
    });
  }

  private async issue(
    input: IssueInput,
    actorPermissions: readonly string[],
  ): Promise<IssuedSanctionReceipt> {
    await this.requireSubjectAuthority(
      input.actorId,
      input.subjectId,
      actorPermissions,
    );
    const now = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockSubject(tx, input.subjectId);
        const subject = await tx.user.findUnique({
          where: { id: input.subjectId },
          select: { id: true },
        });
        if (!subject) this.notFound('User');
        const policy = await this.readPolicy(tx);
        const expiresAt =
          input.kind === 'WARNING'
            ? addDays(now, policy.warningLifetimeDays)
            : readOnlyExpiry(
                this.requiredDate(input.readOnlyUntil),
                now,
                policy,
              );
        const sanction = await tx.moderationSanction.create({
          data: {
            id: randomUUID(),
            subjectId: input.subjectId,
            kind: input.kind,
            origin: input.origin,
            issuerId: input.actorId,
            reason: input.reason,
            contextType: input.context?.type ?? null,
            contextId: input.context?.id ?? null,
            contextPath: input.context?.path ?? null,
            issuedAt: now,
            expiresAt,
          },
        });
        await this.record(tx, input.actorId, 'USER', sanction, 'issued');
        const escalated =
          input.kind === 'WARNING'
            ? await this.escalate(tx, sanction, policy, now)
            : null;
        return { sanctionId: sanction.id, escalatedSanctionId: escalated };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        this.notFound('User');
      }
      throw error;
    }
  }

  private async escalate(
    tx: TransactionClient,
    trigger: ModerationSanction,
    policy: ModerationSanctionPolicy,
    now: Date,
  ): Promise<string | null> {
    const warnings = await tx.moderationSanction.findMany({
      where: {
        subjectId: trigger.subjectId,
        kind: 'WARNING',
        consumedAt: null,
        ...this.activeWhere(now),
      },
      orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    if (!shouldEscalate(warnings.length, policy)) return null;
    const consumed = warnings.slice(0, policy.escalationWarningCount);
    const readOnly = await tx.moderationSanction.create({
      data: {
        id: randomUUID(),
        subjectId: trigger.subjectId,
        kind: 'READ_ONLY',
        origin: 'ESCALATION',
        issuerId: null,
        reason: `Automatic read-only after ${policy.escalationWarningCount} active warnings.`,
        contextType: trigger.contextType,
        contextId: trigger.contextId,
        contextPath: trigger.contextPath,
        issuedAt: now,
        expiresAt: addDays(now, policy.escalationReadOnlyDays),
      },
    });
    const updated = await tx.moderationSanction.updateMany({
      where: { id: { in: consumed.map(({ id }) => id) }, consumedAt: null },
      data: { consumedAt: now, consumedBySanctionId: readOnly.id },
    });
    if (updated.count !== consumed.length) {
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'Escalation warnings changed concurrently.',
      );
    }
    await this.record(tx, null, 'SYSTEM', readOnly, 'issued', undefined, {
      consumedWarningIds: consumed.map(({ id }) => id),
      triggerSanctionId: trigger.id,
    });
    return readOnly.id;
  }

  private async requireSubjectAuthority(
    actorId: string,
    subjectId: string,
    actorPermissions: readonly string[],
  ): Promise<void> {
    if (actorId === subjectId) {
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'You cannot sanction yourself or revoke your own sanction.',
      );
    }
    if (actorPermissions.includes(Permission.ModerationSanctionsStaff)) return;
    const subject = await this.subjects.getAccessProfileByUserId(subjectId);
    if (
      subject.permissions.some((permission) =>
        SANCTIONING_PERMISSIONS.includes(permission),
      )
    ) {
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Sanctioning staff requires the staff sanction permission.',
      );
    }
  }

  private require(actor: ModerationActor, permission: string): void {
    if (!actor.permissions.includes(permission)) {
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Insufficient permissions.',
      );
    }
  }

  private context(
    input: SanctionContextInput,
  ): ModerationSanctionContext | null {
    return normalizeSanctionContext(input);
  }

  private requiredDate(value: Date | null): Date {
    if (!value) {
      throw new ModerationSanctionError(
        'INVALID_INPUT',
        'Read-only requires an expiry.',
      );
    }
    return value;
  }

  private activeWhere(at: Date) {
    return { revokedAt: null, expiresAt: { gt: at } } as const;
  }

  private async lockSubject(
    tx: TransactionClient,
    subjectId: string,
  ): Promise<void> {
    const coordinate = 'moderation.sanctions:' + subjectId;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))`;
  }

  private async readPolicy(
    client: Pick<TransactionClient, 'moderationSanctionPolicy'>,
  ): Promise<ModerationSanctionPolicy> {
    const row = await client.moderationSanctionPolicy.findUnique({
      where: { id: POLICY_ID },
    });
    if (!row) return { ...DEFAULT_MODERATION_SANCTION_POLICY };
    return {
      warningLifetimeDays: row.warningLifetimeDays,
      escalationWarningCount: row.escalationWarningCount,
      escalationReadOnlyDays: row.escalationReadOnlyDays,
      readOnlyMaxDays: row.readOnlyMaxDays,
    };
  }

  private async record(
    tx: TransactionClient,
    actorId: string | null,
    actorType: 'USER' | 'SYSTEM',
    sanction: ModerationSanction,
    action: 'issued' | 'revoked',
    reason?: string,
    extra: Record<string, string | string[]> = {},
  ): Promise<void> {
    const payload = {
      sanctionId: sanction.id,
      subjectId: sanction.subjectId,
      kind: sanction.kind,
      origin: sanction.origin,
      expiresAt: sanction.expiresAt.toISOString(),
      contextType: sanction.contextType,
      contextId: sanction.contextId,
      ...extra,
    };
    await this.audit.append(tx, {
      action: 'moderation.sanction_' + action,
      actorType,
      actorId: actorId ?? undefined,
      targetType: 'User',
      targetId: sanction.subjectId,
      reason: reason ?? sanction.reason,
      metadata: payload,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: 'moderation.sanction.' + action + '.v1',
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId: actorId ?? undefined,
        aggregate: { type: 'ModerationSanction', id: sanction.id },
        payload,
      }),
    );
  }

  private toRecord(row: ModerationSanction): ModerationSanctionRecord {
    return {
      id: row.id,
      subjectId: row.subjectId,
      kind: row.kind,
      origin: row.origin,
      issuerId: row.issuerId,
      reason: row.reason,
      context:
        row.contextType && row.contextId
          ? { type: row.contextType, id: row.contextId, path: row.contextPath }
          : null,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      revokedById: row.revokedById,
      revokeReason: row.revokeReason,
      consumedAt: row.consumedAt,
      consumedBySanctionId: row.consumedBySanctionId,
    };
  }

  private notFound(target = 'Sanction'): never {
    throw new ModerationSanctionError('NOT_FOUND', target + ' was not found.');
  }
}

/** Three strikes are a policy; the fourth is a conversation with an administrator. */
