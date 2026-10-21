/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications Tests
 * 📄 File: apps/api/src/modules/notifications/notifications-module-boundary.spec.ts
 *
 * 🎯 Purpose:
 * Prevents internal notification preferences providers becoming integration APIs.
 *
 * 🏗️ Architecture:
 * Nest module metadata regression; service and HTTP behavior have separate tests.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { NotificationsModule } from './notifications.module';
import { NotificationPreferencesService } from './application/services/notification-preferences.service';
import { NotificationPreferencesResolver } from './presentation/graphql/resolvers/notification-preferences.resolver';

describe('Notifications integration boundary', () => {
  it('keeps preferences service and resolver private while retaining local providers', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, NotificationsModule) ?? [],
    ).toEqual([]);
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NotificationsModule,
    ) as unknown[];
    expect(providers).toContain(NotificationPreferencesService);
    expect(providers).toContain(NotificationPreferencesResolver);
  });
});
