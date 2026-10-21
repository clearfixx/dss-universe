/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-access-group.repository.ts
 *
 * 🎯 Purpose:
 * Persists owned groups/history and delegates composed atomic membership grants.
 *
 * 🧠 Responsibilities:
 * • keeps database transactions and minimal projections private;
 * • commits attributable audit with each mutation;
 * • never adds access-group membership to system-role permissions.
 *
 * 🏗️ Architecture:
 * Private IAM infrastructure; application ports expose no ORM clients.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessGroupKeyConflict } from '../../access-groups/domain/access-group.errors';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import {
  MEMBERSHIP_GRANT_TRANSACTION,
  type MembershipGrantTransaction,
} from '../../contracts/membership-grant-transaction.port';
import { membershipSelect } from './access-membership.shape';
import type { AccessGroupRepository } from '../../access-groups/contracts/access-group.repository.interface';
import type { PublicAccessGroup } from '../../access-groups/contracts/public-group-display.contract';
import type {
  AccessCapability,
  AccessGroupRecord,
  CreateAccessGroup,
  UpdateAccessGroup,
  GrantAccessMembership,
  MembershipRecord,
  EffectiveAccessMembership,
} from '../../access-groups/domain/access-group.types';

const groupSelect = {
  id: true,
  key: true,
  displayName: true,
  kind: true,
  enabled: true,
  isPublic: true,
  color: true,
  badgeLabel: true,
  icon: true,
  createdAt: true,
  updatedAt: true,
  capabilities: { select: { key: true }, orderBy: { key: 'asc' } },
} as const;
type SelectedGroup = Omit<AccessGroupRecord, 'capabilities'> & {
  capabilities: { key: AccessCapability }[];
};

@Injectable()
export class PrismaAccessGroupRepository implements AccessGroupRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    @Inject(MEMBERSHIP_GRANT_TRANSACTION)
    private readonly grants: MembershipGrantTransaction,
  ) {}

  private toGroup(record: SelectedGroup): AccessGroupRecord {
    return {
      ...record,
      capabilities: record.capabilities.map(({ key }) => key),
    };
  }
  async list(
    after: string | undefined,
    limit: number,
  ): Promise<readonly AccessGroupRecord[]> {
    return (
      await this.prisma.accessGroup.findMany({
        where: after ? { id: { gt: after } } : {},
        orderBy: { id: 'asc' },
        take: limit,
        select: groupSelect,
      })
    ).map((record) => this.toGroup(record));
  }
  memberships(
    filter: Readonly<{ groupId?: string; subjectId?: string }>,
    after: string | undefined,
    limit: number,
  ): Promise<readonly MembershipRecord[]> {
    return this.prisma.accessGroupMembership.findMany({
      where: {
        groupId: filter.groupId,
        subjectId: filter.subjectId,
        ...(after ? { id: { gt: after } } : {}),
      },
      orderBy: { id: 'asc' },
      take: limit,
      select: membershipSelect,
    });
  }
  async findById(id: string): Promise<AccessGroupRecord | null> {
    const record = await this.prisma.accessGroup.findUnique({
      where: { id },
      select: groupSelect,
    });
    return record ? this.toGroup(record) : null;
  }
  create(
    input: CreateAccessGroup,
    actorId: string,
  ): Promise<AccessGroupRecord> {
    return this.prisma
      .transaction(async (tx) => {
        const record = await tx.accessGroup.create({
          data: {
            key: input.key,
            displayName: input.displayName,
            createdById: actorId,
            isPublic: input.isPublic,
            color: input.color,
            badgeLabel: input.badgeLabel,
            icon: input.icon,
            capabilities: {
              create: input.capabilities.map((key) => ({ key })),
            },
          },
          select: groupSelect,
        });
        await this.audit.append(tx, {
          action: 'iam.access-group.created',
          actorType: 'USER',
          actorId,
          targetType: 'AccessGroup',
          targetId: record.id,
          metadata: { key: record.key, capabilities: [...input.capabilities] },
        });
        return this.toGroup(record);
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new AccessGroupKeyConflict();
        throw error;
      });
  }
  update(
    id: string,
    input: UpdateAccessGroup,
    actorId: string,
  ): Promise<AccessGroupRecord | null> {
    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM access_groups WHERE id = ${id} FOR UPDATE`;
      const before = await tx.accessGroup.findUnique({
        where: { id },
        select: groupSelect,
      });
      if (!before) return null;
      const record = await tx.accessGroup.update({
        where: { id },
        data: {
          displayName: input.displayName,
          enabled: input.enabled,
          isPublic: input.isPublic,
          color: input.color,
          badgeLabel: input.badgeLabel,
          icon: input.icon,
        },
        select: groupSelect,
      });
      await this.audit.append(tx, {
        action: 'iam.access-group.updated',
        actorType: 'USER',
        actorId,
        targetType: 'AccessGroup',
        targetId: id,
        metadata: {
          previous: {
            displayName: before.displayName,
            enabled: before.enabled,
            isPublic: before.isPublic,
            color: before.color,
            badgeLabel: before.badgeLabel,
            icon: before.icon,
          },
          current: {
            displayName: record.displayName,
            enabled: record.enabled,
            isPublic: record.isPublic,
            color: record.color,
            badgeLabel: record.badgeLabel,
            icon: record.icon,
          },
        },
      });
      return this.toGroup(record);
    });
  }
  setCapabilities(
    id: string,
    capabilities: readonly AccessCapability[],
    actorId: string,
  ): Promise<AccessGroupRecord | null> {
    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM access_groups WHERE id = ${id} FOR UPDATE`;
      const before = await tx.accessGroup.findUnique({
        where: { id },
        select: groupSelect,
      });
      if (!before) return null;
      await tx.accessGroupCapability.deleteMany({ where: { groupId: id } });
      await tx.accessGroupCapability.createMany({
        data: capabilities.map((key) => ({ groupId: id, key })),
      });
      await this.audit.append(tx, {
        action: 'iam.access-group.capabilities.changed',
        actorType: 'USER',
        actorId,
        targetType: 'AccessGroup',
        targetId: id,
        metadata: {
          previous: before.capabilities.map(({ key }) => key),
          current: [...capabilities],
        },
      });
      return this.toGroup(
        await tx.accessGroup.findUniqueOrThrow({
          where: { id },
          select: groupSelect,
        }),
      );
    });
  }
  grant(
    input: GrantAccessMembership,
    actorId: string,
  ): Promise<MembershipRecord | null> {
    return this.grants.grant(input, actorId);
  }
  revoke(
    id: string,
    actorId: string,
    reason: string,
    at: Date,
  ): Promise<MembershipRecord | null> {
    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM access_group_memberships WHERE id = ${id} FOR UPDATE`;
      const before = await tx.accessGroupMembership.findUnique({
        where: { id },
        select: membershipSelect,
      });
      if (!before || before.revokedAt) return before;
      const record = await tx.accessGroupMembership.update({
        where: { id },
        data: { revokedAt: at, revokedById: actorId, revokeReason: reason },
        select: membershipSelect,
      });
      await this.audit.append(tx, {
        action: 'iam.access-membership.revoked',
        actorType: 'USER',
        actorId,
        targetType: 'AccessGroupMembership',
        targetId: id,
        reason,
        metadata: { subjectId: record.subjectId, groupId: record.groupId },
      });
      return record;
    });
  }
  async effectiveMemberships(
    subjectId: string,
    at: Date,
  ): Promise<readonly EffectiveAccessMembership[]> {
    const records = await this.prisma.accessGroup.findMany({
      where: {
        enabled: true,
        memberships: {
          some: {
            subjectId,
            revokedAt: null,
            validFrom: { lte: at },
            OR: [{ validUntil: null }, { validUntil: { gt: at } }],
          },
        },
      },
      select: {
        key: true,
        kind: true,
        capabilities: { select: { key: true }, orderBy: { key: 'asc' } },
      },
      orderBy: { key: 'asc' },
    });
    return records.map((record) => ({
      key: record.key,
      kind: record.kind,
      capabilities: record.capabilities.map(({ key }) => key),
    }));
  }
  publicGroups(
    subjectId: string,
    at: Date,
  ): Promise<readonly PublicAccessGroup[]> {
    return this.prisma.accessGroup.findMany({
      where: {
        enabled: true,
        isPublic: true,
        memberships: {
          some: {
            subjectId,
            revokedAt: null,
            validFrom: { lte: at },
            OR: [{ validUntil: null }, { validUntil: { gt: at } }],
          },
        },
      },
      orderBy: { key: 'asc' },
      select: {
        key: true,
        displayName: true,
        color: true,
        badgeLabel: true,
        icon: true,
      },
    });
  }
}
