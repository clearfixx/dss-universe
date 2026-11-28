/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/infrastructure/prisma-account-ban-records.ts
 *
 * 🎯 Purpose:
 * Permanent bans (owner 2026-11-27): administrators ban an account for a
 * community rule and lift it; the banned person reads the notice with the
 * ticket received at login.
 *
 * ⚠️ Important:
 * The owner is never bannable and only the owner bans an administrator.
 * The ban record, the account status and session revocation share one
 * transaction. Rows are never deleted.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  Permission,
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import type {
  ModerationActor,
  SanctionContextInput,
} from '../application/moderation-sanctions.commands';
import {
  BAN_TRANSACTION,
  type BanTransaction,
} from '../contracts/ban-transaction.port';
import { banReference } from '../domain/account-ban.rules';
import { compareRuleCodes } from '../domain/community-rule.rules';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import {
  normalizeSanctionContext,
  normalizeSanctionReason,
} from '../domain/moderation-sanction.rules';
import type { AccountBanRecord } from '../domain/types/account-ban.type';
import { accountBanRecord } from './prisma-account-ban.ledger';

export type IssueBanCommand = {
  subjectId: string;
  ruleId: string;
  comment: string;
  context: SanctionContextInput | null;
};

@Injectable()
export class AccountBansService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUBJECT_ACCESS_READER)
    private readonly subjects: SubjectAccessReader,
    @Inject(BAN_TRANSACTION) private readonly bans: BanTransaction,
  ) {}

  async issue(
    actor: ModerationActor,
    command: IssueBanCommand,
  ): Promise<AccountBanRecord> {
    this.require(actor);
    const comment = normalizeSanctionReason(command.comment);
    const context = command.context
      ? normalizeSanctionContext(command.context)
      : null;
    await this.requireAuthorityOver(actor.id, command.subjectId);
    const rule = await this.prisma.communityRule.findUnique({
      where: { id: command.ruleId },
    });
    if (!rule || !rule.active)
      throw new ModerationSanctionError(
        'INVALID_INPUT',
        'Choose a community rule that is in force.',
      );
    const issuedAt = new Date();
    const issued = await this.bans.issue({
      reference: banReference(issuedAt, randomBytes(3)),
      subjectId: command.subjectId,
      issuerId: actor.id,
      ruleId: rule.id,
      ruleCode: rule.code,
      ruleText: rule.text,
      comment,
      context,
      issuedAt,
    });
    if (!issued)
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'This account cannot be banned: it is already banned or deleted.',
      );
    return issued;
  }

  async lift(
    actor: ModerationActor,
    banId: string,
    reason: string,
  ): Promise<AccountBanRecord> {
    this.require(actor);
    const liftReason = normalizeSanctionReason(reason);
    const known = await this.prisma.accountBan.findUnique({
      where: { id: banId },
      select: { id: true },
    });
    if (!known)
      throw new ModerationSanctionError('NOT_FOUND', 'Ban not found.');
    const lifted = await this.bans.lift(banId, actor.id, liftReason);
    if (!lifted)
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'This ban was already lifted.',
      );
    return lifted;
  }

  /** Rules an administrator can ban for, in numeric order. */
  async banRules(
    actor: ModerationActor,
  ): Promise<Array<{ id: string; code: string; text: string }>> {
    this.require(actor);
    const rows = await this.prisma.communityRule.findMany({
      where: { active: true },
      select: { id: true, code: true, text: true },
    });
    return rows.sort((a, b) => compareRuleCodes(a.code, b.code));
  }

  /** Bans in force, newest first. */
  async inForceList(
    actor: ModerationActor,
    page: number,
    limit: number,
  ): Promise<{ items: AccountBanRecord[]; total: number }> {
    this.require(actor);
    const take = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const where = { liftedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.accountBan.findMany({
        where,
        orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
        skip: (Math.max(Math.trunc(page), 1) - 1) * take,
        take,
      }),
      this.prisma.accountBan.count({ where }),
    ]);
    return { items: rows.map(accountBanRecord), total };
  }

  /** The ban in force for an account, if any. */
  async activeBan(
    actor: ModerationActor,
    subjectId: string,
  ): Promise<AccountBanRecord | null> {
    this.require(actor);
    const row = await this.inForce(subjectId);
    return row ? accountBanRecord(row) : null;
  }

  /** What the banned person sees; the ticket is the only proof needed. */
  async notice(ticket: string): Promise<AccountBanRecord> {
    const subjectId = await this.bans.ticketSubject(ticket);
    const row = subjectId ? await this.inForce(subjectId) : null;
    if (!row)
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Sign in again to see your ban notice.',
      );
    return accountBanRecord(row);
  }

  private inForce(subjectId: string) {
    return this.prisma.accountBan.findFirst({
      where: { subjectId, liftedAt: null },
    });
  }

  private require(actor: ModerationActor): void {
    if (!actor.permissions.includes(Permission.ModerationBansManage))
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Permanent bans are managed by administrators.',
      );
  }

  private async requireAuthorityOver(
    actorId: string,
    subjectId: string,
  ): Promise<void> {
    if (actorId === subjectId)
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'You cannot ban yourself.',
      );
    const [actor, subject] = await Promise.all([
      this.subjects.getAccessProfileByUserId(actorId),
      this.subjects.getAccessProfileByUserId(subjectId),
    ]);
    if (subject.roles.includes('owner'))
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'The platform owner cannot be banned.',
      );
    if (subject.roles.includes('admin') && !actor.roles.includes('owner'))
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Only the owner may ban an administrator.',
      );
  }
}
