/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure/repositories/prisma-custom-titles.repository.ts
 *
 * 🎯 Purpose:
 * Persists owned title lifecycle/selection and delegates composed title grants.
 *
 * 🧠 Responsibilities:
 * • serializes title lifecycle and per-user selection changes;
 * • retains revoked grants as moderation history;
 * • applies selection cooldown atomically;
 * • appends Audit and Outbox evidence inside business transactions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { OutboxWriterService } from '@api/core/events';

import type { CustomTitlesRepository } from '../../domain/repositories/custom-titles.repository.interface';
import type {
  CreateCustomTitle,
  CustomTitle,
  CustomTitleSettings,
  TitleGrantResult,
  TitleRevokeResult,
  TitleSelectionResult,
  TitleWriteResult,
  UpdateCustomTitle,
  UserTitleGrant,
} from '../../domain/types/custom-titles.type';

import {
  TITLE_GRANT_TRANSACTION,
  type TitleGrantTransaction,
} from '../../contracts/title-grant-transaction.port';
import { grantInclude, toTitleGrant } from './title-grant.shape';
import { TitleEvidenceWriter } from './title-evidence.writer';
const SETTINGS_ID = 'global';

@Injectable()
export class PrismaCustomTitlesRepository implements CustomTitlesRepository {
  private readonly evidence: TitleEvidenceWriter;
  constructor(
    private readonly prisma: PrismaService,
    audit: AuditWriterService,
    outbox: OutboxWriterService,
    @Inject(TITLE_GRANT_TRANSACTION)
    private readonly titleGrants: TitleGrantTransaction,
  ) {
    this.evidence = new TitleEvidenceWriter(audit, outbox);
  }

  definitions(includeInactive: boolean): Promise<CustomTitle[]> {
    return this.prisma.customTitle.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async create(
    input: CreateCustomTitle,
  ): Promise<TitleWriteResult<CustomTitle>> {
    try {
      const title = await this.prisma.$transaction(async (transaction) => {
        await this.lock(transaction, 'custom-titles:definitions');
        const created = await transaction.customTitle.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            color: input.color,
            badge: input.badge,
            createdById: input.actorId,
            updatedById: input.actorId,
          },
        });
        await this.evidence.record(
          transaction,
          'created',
          input.actorId,
          'CustomTitle',
          created.id,
          this.titlePayload(created),
        );
        return created;
      });
      return { status: 'OK', value: title };
    } catch (error) {
      if (this.uniqueConflict(error)) {
        return { status: 'CONFLICT', value: null };
      }
      throw error;
    }
  }

  async update(
    input: UpdateCustomTitle,
  ): Promise<TitleWriteResult<CustomTitle>> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.lock(transaction, 'custom-titles:definitions');
        const existing = await transaction.customTitle.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        if (!existing) return { status: 'NOT_FOUND', value: null };
        if (!input.isActive) {
          await transaction.userTitleSelection.deleteMany({
            where: { grant: { titleId: input.id } },
          });
        }
        const title = await transaction.customTitle.update({
          where: { id: input.id },
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            color: input.color,
            badge: input.badge,
            isActive: input.isActive,
            updatedById: input.actorId,
          },
        });
        await this.evidence.record(
          transaction,
          'updated',
          input.actorId,
          'CustomTitle',
          title.id,
          this.titlePayload(title),
        );
        return { status: 'OK', value: title };
      });
    } catch (error) {
      if (this.uniqueConflict(error)) {
        return { status: 'CONFLICT', value: null };
      }
      throw error;
    }
  }

  async grants(
    userId: string,
    includeRevoked: boolean,
  ): Promise<UserTitleGrant[]> {
    const records = await this.prisma.userTitleGrant.findMany({
      where: {
        userId,
        ...(includeRevoked ? {} : { revokedAt: null }),
      },
      include: grantInclude,
      orderBy: [{ grantedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => toTitleGrant(record));
  }

  grant(
    userId: string,
    titleId: string,
    reason: string,
    actorId: string,
  ): Promise<TitleGrantResult> {
    return this.titleGrants.grant({ userId, titleId, reason, actorId });
  }

  async revoke(
    grantId: string,
    reason: string,
    actorId: string,
  ): Promise<TitleRevokeResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `custom-titles:grant:${grantId}`);
      const existing = await transaction.userTitleGrant.findUnique({
        where: { id: grantId },
        include: grantInclude,
      });
      if (!existing) return { status: 'NOT_FOUND', grant: null };
      if (existing.revokedAt) {
        return { status: 'ALREADY_REVOKED', grant: null };
      }
      if (existing.selection) {
        await transaction.userTitleSelection.delete({
          where: { userId: existing.userId },
        });
      }
      const grant = await transaction.userTitleGrant.update({
        where: { id: grantId },
        data: {
          revokedAt: new Date(),
          revokedById: actorId,
          revokeReason: reason,
        },
        include: grantInclude,
      });
      const payload = {
        userId: grant.userId,
        titleId: grant.titleId,
        grantId,
        reason,
      };
      await this.evidence.record(
        transaction,
        'revoked',
        actorId,
        'UserTitleGrant',
        grantId,
        payload,
      );
      return { status: 'OK', grant: toTitleGrant(grant) };
    });
  }

  async select(userId: string, grantId: string): Promise<TitleSelectionResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `custom-titles:selection:${userId}`);
      const [grant, current, settings] = await Promise.all([
        transaction.userTitleGrant.findFirst({
          where: { id: grantId, userId, revokedAt: null },
          include: grantInclude,
        }),
        transaction.userTitleSelection.findUnique({
          where: { userId },
        }),
        this.settingsIn(transaction),
      ]);
      if (!grant) {
        return { status: 'NOT_FOUND', grant: null, retryAt: null };
      }
      if (!grant.title.isActive) {
        return { status: 'INACTIVE', grant: null, retryAt: null };
      }
      if (current?.grantId === grantId) {
        return {
          status: 'UNCHANGED',
          grant: toTitleGrant({ ...grant, selection: { userId } }),
          retryAt: null,
        };
      }
      const retryAt = current
        ? new Date(
            current.selectedAt.getTime() +
              settings.selectionCooldownDays * 86_400_000,
          )
        : null;
      if (retryAt && retryAt.getTime() > Date.now()) {
        return { status: 'COOLDOWN', grant: null, retryAt };
      }
      const selectedAt = new Date();
      await transaction.userTitleSelection.upsert({
        where: { userId },
        update: { grantId, selectedAt },
        create: { userId, grantId, selectedAt },
      });
      const payload = { userId, titleId: grant.titleId, grantId };
      await this.evidence.record(
        transaction,
        'selected',
        userId,
        'UserTitleSelection',
        userId,
        payload,
      );
      return {
        status: 'OK',
        grant: toTitleGrant({ ...grant, selection: { userId } }),
        retryAt: null,
      };
    });
  }

  async settings(): Promise<CustomTitleSettings> {
    return this.settingsIn(this.prisma);
  }

  async updateSettings(
    selectionCooldownDays: number,
    actorId: string,
  ): Promise<CustomTitleSettings> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, 'custom-titles:settings');
      const settings = await transaction.customTitleSettings.upsert({
        where: { id: SETTINGS_ID },
        update: { selectionCooldownDays, updatedById: actorId },
        create: {
          id: SETTINGS_ID,
          selectionCooldownDays,
          updatedById: actorId,
        },
      });
      await this.evidence.record(
        transaction,
        'settings.updated',
        actorId,
        'CustomTitleSettings',
        SETTINGS_ID,
        { selectionCooldownDays },
      );
      return this.toSettings(settings);
    });
  }

  private async settingsIn(
    client: TransactionClient | PrismaService,
  ): Promise<CustomTitleSettings> {
    const settings = await client.customTitleSettings.findUniqueOrThrow({
      where: { id: SETTINGS_ID },
    });
    return this.toSettings(settings);
  }

  private titlePayload(title: CustomTitle): Record<string, unknown> {
    return {
      titleId: title.id,
      name: title.name,
      slug: title.slug,
      color: title.color,
      badge: title.badge,
      isActive: title.isActive,
    };
  }

  private toSettings(settings: {
    selectionCooldownDays: number;
    updatedById: string | null;
    updatedAt: Date;
  }): CustomTitleSettings {
    return {
      selectionCooldownDays: settings.selectionCooldownDays,
      updatedById: settings.updatedById,
      updatedAt: settings.updatedAt,
    };
  }

  private lock(
    transaction: TransactionClient,
    coordinate: string,
  ): Promise<number> {
    return transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))
    `;
  }

  private uniqueConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

/**
 * One selected badge, many earned stories, zero accidental admin powers.
 */
