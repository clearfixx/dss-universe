/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications Tests
 * 📄 File: apps/api/src/modules/notifications/application/services/notification-preferences.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies defaults and deterministic notification preference updates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { NotificationPreferencesRepository } from '../../domain/repositories/notification-preferences.repository.interface';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferencesService,
} from './notification-preferences.service';

describe('NotificationPreferencesService', () => {
  const upsert: jest.MockedFunction<
    NotificationPreferencesRepository['upsert']
  > = jest.fn();
  const repository: jest.Mocked<NotificationPreferencesRepository> = {
    findByUserId: jest.fn(),
    upsert,
  };
  const service = new NotificationPreferencesService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('returns stable defaults before settings are persisted', async () => {
    repository.findByUserId.mockResolvedValue(null);

    await expect(service.get('user-1')).resolves.toEqual({
      userId: 'user-1',
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    });
  });

  it('normalizes category order before persistence', async () => {
    upsert.mockImplementation((userId, preferences) =>
      Promise.resolve({ userId, ...preferences }),
    );

    await service.update('user-1', {
      inAppCategories: ['SUPPORT', 'MENTIONS'],
      emailEnabled: false,
      emailCategories: ['SUPPORT', 'MENTIONS'],
      digestFrequency: 'WEEKLY',
    });

    expect(upsert).toHaveBeenCalledWith('user-1', {
      inAppCategories: ['MENTIONS', 'SUPPORT'],
      emailEnabled: false,
      emailCategories: ['MENTIONS', 'SUPPORT'],
      digestFrequency: 'WEEKLY',
    });
  });
});

/**
 * Deterministic order makes audit diffs pleasantly boring.
 */
