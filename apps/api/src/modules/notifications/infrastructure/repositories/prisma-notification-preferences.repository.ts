/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/infrastructure/repositories/prisma-notification-preferences.repository.ts
 *
 * 🎯 Purpose:
 * Persists notification preferences and their immutable audit record.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { NotificationPreferencesRepository } from '../../domain/repositories/notification-preferences.repository.interface';
import type {
  NotificationPreferences,
  UpdateNotificationPreferences,
} from '../../domain/types/notification-preferences.type';

@Injectable()
export class PrismaNotificationPreferencesRepository implements NotificationPreferencesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    return this.prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });
  }

  async upsert(
    userId: string,
    preferences: UpdateNotificationPreferences,
  ): Promise<NotificationPreferences> {
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.userNotificationPreferences.upsert({
        where: { userId },
        create: { userId, ...preferences },
        update: preferences,
      });
      await this.audit.append(transaction, {
        action: 'notification.preferences.updated',
        actorType: 'USER',
        actorId: userId,
        targetType: 'UserNotificationPreferences',
        targetId: userId,
        metadata: preferences,
      });
      return record;
    });
  }
}

/**
 * Audit the switchboard, never the content of a notification.
 */
