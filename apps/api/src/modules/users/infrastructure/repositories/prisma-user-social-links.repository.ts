/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-social-links.repository.ts
 *
 * 🎯 Purpose:
 * Persists ordered profile social links with soft-disable and audit history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { UserSocialLinksRepository } from '../../domain/repositories/user-social-links.repository.interface';
import type {
  ReplaceUserSocialLink,
  UserSocialLink,
} from '../../domain/types/user-social-link.type';

@Injectable()
export class PrismaUserSocialLinksRepository implements UserSocialLinksRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async findByUserIds(
    userIds: string[],
  ): Promise<Map<string, UserSocialLink[]>> {
    const records = await this.prisma.userSocialLink.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      orderBy: [{ userId: 'asc' }, { position: 'asc' }, { platform: 'asc' }],
    });
    const byUser = new Map<string, UserSocialLink[]>();
    for (const record of records) {
      const links = byUser.get(record.userId) ?? [];
      links.push(this.toDomain(record));
      byUser.set(record.userId, links);
    }
    return byUser;
  }

  async replaceForUser(
    userId: string,
    links: ReplaceUserSocialLink[],
  ): Promise<UserSocialLink[]> {
    return this.prisma.$transaction(async (transaction) => {
      const changedAt = new Date();
      await transaction.userSocialLink.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: changedAt },
      });
      for (const link of links) {
        await transaction.userSocialLink.upsert({
          where: {
            userId_platform: { userId, platform: link.platform },
          },
          create: { userId, ...link },
          update: { ...link, deletedAt: null },
        });
      }
      await this.audit.append(transaction, {
        action: 'user.profile.social_links_updated',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
        metadata: {
          platforms: links.map(({ platform }) => platform),
          count: links.length,
        },
      });
      const records = await transaction.userSocialLink.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ position: 'asc' }, { platform: 'asc' }],
      });
      return records.map((record) => this.toDomain(record));
    });
  }

  private toDomain(record: {
    id: string;
    userId: string;
    platform: string;
    label: string | null;
    url: string;
    position: number;
  }): UserSocialLink {
    return {
      id: record.id,
      userId: record.userId,
      platform: record.platform,
      label: record.label,
      url: record.url,
      position: record.position,
    };
  }
}
