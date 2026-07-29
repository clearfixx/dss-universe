/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure/repositories/prisma-custom-titles.repository.ts
 *
 * 🎯 Purpose:
 * Persists title definitions, historical grants, selection, and cooldown policy.
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

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  createEventEnvelope,
  type JsonValue,
  OutboxWriterService,
} from '@api/core/events';

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

const PRODUCER = 'dss.api.custom-titles';
const SETTINGS_ID = 'global';

const grantInclude = {
  title: true,
  selection: { select: { userId: true } },
} as const;

type GrantRow = Prisma.UserTitleGrantGetPayload<{
  include: typeof grantInclude;
}>;

@Injectable()
export class PrismaCustomTitlesRepository implements CustomTitlesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

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
        await this.record(
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
        await this.record(
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
    return records.map((record) => this.toGrant(record));
  }

  async grant(
    userId: string,
    titleId: string,
    reason: string,
    actorId: string,
  ): Promise<TitleGrantResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lock(transaction, `custom-titles:grant:${userId}:${titleId}`);
      const [user, title, existing] = await Promise.all([
        transaction.user.findUnique({
          where: { id: userId },
          select: { id: true },
        }),
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
        data: {
          userId,
          titleId,
          grantedById: actorId,
          grantReason: reason,
        },
        include: grantInclude,
      });
      const payload = { userId, titleId, grantId: grant.id, reason };
      await this.record(
        transaction,
        'granted',
        actorId,
        'UserTitleGrant',
        grant.id,
        payload,
      );
      return { status: 'OK', grant: this.toGrant(grant) };
    });
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
      await this.record(
        transaction,
        'revoked',
        actorId,
        'UserTitleGrant',
        grantId,
        payload,
      );
      return { status: 'OK', grant: this.toGrant(grant) };
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
          grant: this.toGrant({ ...grant, selection: { userId } }),
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
      await this.record(
        transaction,
        'selected',
        userId,
        'UserTitleSelection',
        userId,
        payload,
      );
      return {
        status: 'OK',
        grant: this.toGrant({ ...grant, selection: { userId } }),
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
      await this.record(
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

  private async record(
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
        producer: PRODUCER,
        aggregate: { type: targetType, id: targetId },
        actorId,
        payload: jsonPayload,
      }),
    );
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

  private toGrant(record: GrantRow): UserTitleGrant {
    return {
      id: record.id,
      userId: record.userId,
      titleId: record.titleId,
      grantedById: record.grantedById,
      grantReason: record.grantReason,
      grantedAt: record.grantedAt,
      revokedAt: record.revokedAt,
      revokedById: record.revokedById,
      revokeReason: record.revokeReason,
      title: record.title,
      selected: Boolean(record.selection),
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
