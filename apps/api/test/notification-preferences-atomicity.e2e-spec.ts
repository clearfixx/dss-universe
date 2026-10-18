/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications Audit
 * 📄 File: apps/api/test/notification-preferences-atomicity.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies preferences and Audit atomicity against fully migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • proves default reads do not persist an owner row;
 * • verifies failed Audit rolls back both initial and replacement preferences;
 * • checks committed replacement and exact Audit evidence.
 *
 * 🏗️ Architecture:
 * Test-only composition with real service/repository and isolated schema.
 *
 * ⚠️ Important:
 * Only Audit failure is injected; no successful persistence result is mocked.
 * No delivery pipeline or HTTP guard coverage is claimed here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { NotificationPreferencesService } from '../src/modules/notifications/application/services/notification-preferences.service';
import { PrismaNotificationPreferencesRepository } from '../src/modules/notifications/infrastructure/repositories/prisma-notification-preferences.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Notification preferences atomicity (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let service: NotificationPreferencesService;
  let audit: AuditWriterService;
  let userId: string;
  const replacement = {
    inAppCategories: ['SUPPORT' as const],
    emailEnabled: false,
    emailCategories: [],
    digestFrequency: 'WEEKLY' as const,
  };
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: `${userId}@dss.test`,
        passwordHash: 'synthetic-not-delivered',
      },
    });
    audit = new AuditWriterService(new AuditRedactionService());
    service = new NotificationPreferencesService(
      new PrismaNotificationPreferencesRepository(fixture.prisma, audit),
    );
  }, 60000);
  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture?.close();
  });
  it('reads defaults without writing and rolls back initial insert on Audit failure', async () => {
    expect(await service.get(userId)).toMatchObject({
      emailEnabled: true,
      digestFrequency: 'OFF',
    });
    expect(await fixture.prisma.userNotificationPreferences.count()).toBe(0);
    const failure = jest
      .spyOn(audit, 'append')
      .mockRejectedValueOnce(new Error('synthetic audit failure'));
    await expect(service.update(userId, replacement)).rejects.toThrow(
      'synthetic audit failure',
    );
    failure.mockRestore();
    expect(await fixture.prisma.userNotificationPreferences.count()).toBe(0);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'notification.preferences.updated' },
      }),
    ).toBe(0);
  });
  it('preserves the prior row and Audit count on failed replacement', async () => {
    await service.update(userId, replacement);
    const before =
      await fixture.prisma.userNotificationPreferences.findUniqueOrThrow({
        where: { userId },
      });
    const failure = jest
      .spyOn(audit, 'append')
      .mockRejectedValueOnce(new Error('synthetic replacement failure'));
    await expect(
      service.update(userId, { ...replacement, emailEnabled: true }),
    ).rejects.toThrow('synthetic replacement failure');
    failure.mockRestore();
    expect(
      await fixture.prisma.userNotificationPreferences.findUnique({
        where: { userId },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'notification.preferences.updated', actorId: userId },
      }),
    ).toBe(1);
    await service.update(userId, { ...replacement, emailEnabled: true });
    expect(await service.get(userId)).toMatchObject({ emailEnabled: true });
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'notification.preferences.updated', actorId: userId },
      }),
    ).toBe(2);
  });
});
