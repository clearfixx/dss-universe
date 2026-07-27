/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/notifications.module.ts
 *
 * 🎯 Purpose:
 * Wires the Notifications policy foundation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { NotificationPreferencesService } from './application/services/notification-preferences.service';
import { NOTIFICATION_PREFERENCES_REPOSITORY } from './domain/repositories/notification-preferences.repository.interface';
import { PrismaNotificationPreferencesRepository } from './infrastructure/repositories/prisma-notification-preferences.repository';
import { NotificationPreferencesResolver } from './presentation/graphql/resolvers/notification-preferences.resolver';

@Module({
  imports: [PrismaModule],
  providers: [
    NotificationPreferencesService,
    NotificationPreferencesResolver,
    {
      provide: NOTIFICATION_PREFERENCES_REPOSITORY,
      useClass: PrismaNotificationPreferencesRepository,
    },
  ],
  exports: [NotificationPreferencesService],
})
export class NotificationsModule {}

/**
 * This module owns notification policy now and delivery orchestration later.
 */
