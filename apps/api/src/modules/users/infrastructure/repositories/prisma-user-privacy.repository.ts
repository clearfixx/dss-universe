/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-privacy.repository.ts
 *
 * 🎯 Purpose:
 * Persists user privacy policy and its immutable audit trail.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { UserPrivacyRepository } from '../../domain/repositories/user-privacy.repository.interface';
import type {
  UpdateUserPrivacySettings,
  UserPrivacySettings,
} from '../../domain/types/user-privacy-settings.type';

@Injectable()
export class PrismaUserPrivacyRepository implements UserPrivacyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async findByUserId(userId: string): Promise<UserPrivacySettings | null> {
    const settings = await this.prisma.userPrivacySettings.findUnique({
      where: { userId },
    });
    return settings;
  }

  async upsert(
    userId: string,
    settings: UpdateUserPrivacySettings,
  ): Promise<UserPrivacySettings> {
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.userPrivacySettings.upsert({
        where: { userId },
        create: { userId, ...settings },
        update: settings,
      });
      await this.audit.append(transaction, {
        action: 'user.profile.privacy_updated',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
        metadata: settings,
      });
      return record;
    });
  }
}
