/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/infrastructure/prisma-ban-appeals.ts
 *
 * 🎯 Purpose:
 * The banned person's one appeal with screenshots, and its review by
 * administrators and the owner.
 *
 * ⚠️ Important:
 * Banned callers are identified by the login ticket only. Screenshots are
 * reachable by a reviewer only through the appeal they belong to.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import type { ModerationActor } from '../application/moderation-sanctions.commands';
import {
  APPEAL_SCREENSHOT_FILES,
  type AppealScreenshotFiles,
  type ScreenshotFacts,
  type ScreenshotUpload,
} from '../contracts/appeal-screenshots.port';
import {
  BAN_APPEAL_TRANSACTION,
  type BanAppealTransaction,
} from '../contracts/ban-appeal-transaction.port';
import {
  BAN_TRANSACTION,
  type BanTransaction,
} from '../contracts/ban-transaction.port';
import {
  canAddAppealFile,
  normalizeAppealText,
  type BanAppealRecord,
  type BanAppealStatus,
} from '../domain/ban-appeal.rules';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import { normalizeSanctionReason } from '../domain/moderation-sanction.rules';
import type { AccountBanRecord } from '../domain/types/account-ban.type';
import { accountBanRecord } from './prisma-account-ban.ledger';
import { banAppealRecord } from './prisma-ban-appeal.ledger';

const MAX_PAGE_SIZE = 50;

export type AppealFile = ScreenshotFacts & { id: string };

export type AppealState = {
  appeal: BanAppealRecord | null;
  files: AppealFile[];
};

export type ReviewedAppeal = BanAppealRecord & {
  ban: AccountBanRecord;
  files: AppealFile[];
};

@Injectable()
export class BanAppealsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BAN_TRANSACTION) private readonly bans: BanTransaction,
    @Inject(BAN_APPEAL_TRANSACTION)
    private readonly appeals: BanAppealTransaction,
    @Inject(APPEAL_SCREENSHOT_FILES)
    private readonly screenshots: AppealScreenshotFiles,
  ) {}

  /** The banned subject and their ban in force, proven by the login ticket. */
  async requireTicket(
    ticket: string,
  ): Promise<{ banId: string; subjectId: string }> {
    const subjectId = await this.bans.ticketSubject(ticket);
    const ban = subjectId
      ? await this.prisma.accountBan.findFirst({
          where: { subjectId, liftedAt: null },
          select: { id: true },
        })
      : null;
    if (!subjectId || !ban)
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Sign in again to see your ban notice.',
      );
    return { banId: ban.id, subjectId };
  }

  async state(ticket: string): Promise<AppealState> {
    const { banId } = await this.requireTicket(ticket);
    const appeal = await this.prisma.banAppeal.findUnique({
      where: { banId },
    });
    return {
      appeal: appeal ? banAppealRecord(appeal) : null,
      files: await this.files(banId),
    };
  }

  async addFile(ticket: string, file: ScreenshotUpload): Promise<AppealFile> {
    const { banId, subjectId } = await this.requireTicket(ticket);
    // Cheap refusal before the file is stored; the transaction re-checks.
    const [sent, rows] = await Promise.all([
      this.prisma.banAppeal.count({ where: { banId } }),
      this.prisma.banAppealFile.findMany({
        where: { banId },
        select: { removedAt: true },
      }),
    ]);
    const attached = rows.filter((row) => !row.removedAt).length;
    if (sent || !canAddAppealFile(attached, rows.length))
      throw this.fileRefused();
    const stored = await this.screenshots.intake(subjectId, file);
    if (!(await this.appeals.attach(banId, subjectId, stored.mediaId)))
      throw this.fileRefused();
    const row = await this.prisma.banAppealFile.findUniqueOrThrow({
      where: { mediaId: stored.mediaId },
      select: { id: true },
    });
    return { ...stored, id: row.id };
  }

  async removeFile(ticket: string, fileId: string): Promise<boolean> {
    const { banId, subjectId } = await this.requireTicket(ticket);
    if (!(await this.appeals.detach(banId, subjectId, fileId)))
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'This screenshot cannot be removed.',
      );
    return true;
  }

  async submit(ticket: string, text: string): Promise<BanAppealRecord> {
    const { banId } = await this.requireTicket(ticket);
    const appeal = await this.appeals.submit(banId, normalizeAppealText(text));
    if (!appeal)
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'An appeal for this ban was already submitted.',
      );
    return appeal;
  }

  /** Review queue, oldest first for pending appeals. */
  async queue(
    actor: ModerationActor,
    status: BanAppealStatus,
    page: number,
    limit: number,
  ): Promise<{ items: ReviewedAppeal[]; total: number }> {
    this.require(actor);
    const take = Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
    const where = {
      status,
      // A ban lifted directly leaves nothing to decide.
      ...(status === 'PENDING' ? { ban: { liftedAt: null } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.banAppeal.findMany({
        where,
        include: { ban: true },
        orderBy: [
          { submittedAt: status === 'PENDING' ? 'asc' : 'desc' },
          { id: 'asc' },
        ],
        skip: (Math.max(Math.trunc(page), 1) - 1) * take,
        take,
      }),
      this.prisma.banAppeal.count({ where }),
    ]);
    const items = await Promise.all(
      rows.map(async (row) => ({
        ...banAppealRecord(row),
        ban: accountBanRecord(row.ban),
        files: await this.files(row.banId),
      })),
    );
    return { items, total };
  }

  async decide(
    actor: ModerationActor,
    appealId: string,
    accept: boolean,
    reason: string,
  ): Promise<BanAppealRecord> {
    this.require(actor);
    const decisionReason = normalizeSanctionReason(reason);
    const known = await this.prisma.banAppeal.count({
      where: { id: appealId },
    });
    if (!known)
      throw new ModerationSanctionError('NOT_FOUND', 'Appeal not found.');
    const decided = await this.appeals.decide(
      appealId,
      actor.id,
      accept,
      decisionReason,
    );
    if (!decided)
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'This appeal can no longer be decided.',
      );
    return decided;
  }

  async fileAccess(
    actor: ModerationActor,
    appealId: string,
    fileId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    this.require(actor);
    const file = await this.prisma.banAppealFile.findFirst({
      where: {
        id: fileId,
        removedAt: null,
        ban: { appeal: { id: appealId } },
      },
      select: { mediaId: true },
    });
    const access = file
      ? await this.screenshots.reviewAccess(file.mediaId, actor.id)
      : null;
    if (!access)
      throw new ModerationSanctionError(
        'NOT_FOUND',
        'The screenshot is not available.',
      );
    return access;
  }

  private async files(banId: string): Promise<AppealFile[]> {
    const rows = await this.prisma.banAppealFile.findMany({
      where: { banId, removedAt: null },
      orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
      select: { id: true, mediaId: true },
    });
    const facts = new Map(
      (await this.screenshots.describe(rows.map((row) => row.mediaId))).map(
        (item) => [item.mediaId, item],
      ),
    );
    return rows.flatMap((row) => {
      const item = facts.get(row.mediaId);
      return item ? [{ ...item, id: row.id }] : [];
    });
  }

  private fileRefused(): ModerationSanctionError {
    return new ModerationSanctionError(
      'INVALID_STATE',
      'No more screenshots can be added to this appeal.',
    );
  }

  private require(actor: ModerationActor): void {
    if (!actor.permissions.includes(Permission.ModerationBansManage))
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Appeals are reviewed by administrators.',
      );
  }
}
