import { randomUUID } from 'node:crypto';

import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { SHELL_VARIANTS } from '../src/modules/appearance/domain/appearance.types';
import { AppearanceRepository } from '../src/modules/appearance/infrastructure/appearance.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Platform appearance persistence and audit (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let repository: AppearanceRepository;
  let audit: AuditWriterService;
  let actorId: string;

  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    actorId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: actorId,
        username: actorId,
        email: `${actorId}@dss.test`,
        passwordHash: 'test-only',
      },
    });
    audit = new AuditWriterService(new AuditRedactionService());
    repository = new AppearanceRepository(fixture.prisma, audit);
  }, 60000);

  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture?.close();
  });

  it('returns the default without creating a configuration row', async () => {
    expect(await repository.get()).toMatchObject({
      activeShellVariant: SHELL_VARIANTS.MODULE_LAUNCHER,
    });
    expect(await fixture.prisma.platformAppearanceSettings.count()).toBe(0);
  });

  it('persists a global variant and matching audit evidence', async () => {
    await repository.update(actorId, SHELL_VARIANTS.HYBRID);
    expect(await repository.get()).toMatchObject({
      activeShellVariant: SHELL_VARIANTS.HYBRID,
      updatedById: actorId,
    });
    expect(
      await fixture.prisma.auditRecord.count({
        where: { actorId, action: 'platform.appearance.update' },
      }),
    ).toBe(1);
    await repository.update(actorId, SHELL_VARIANTS.HORIZONTAL_NAVIGATION);
    expect(await fixture.prisma.platformAppearanceSettings.count()).toBe(1);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { actorId, action: 'platform.appearance.update' },
      }),
    ).toBe(2);
  });

  it('rolls back variant updates when audit append fails', async () => {
    await repository.update(actorId, SHELL_VARIANTS.HYBRID);
    const before =
      await fixture.prisma.platformAppearanceSettings.findUniqueOrThrow({
        where: { id: 'global' },
      });
    const appendFailure = jest
      .spyOn(audit, 'append')
      .mockRejectedValueOnce(new Error('synthetic appearance audit failure'));
    await expect(
      repository.update(actorId, SHELL_VARIANTS.MODULE_LAUNCHER),
    ).rejects.toThrow('synthetic appearance audit failure');
    appendFailure.mockRestore();

    expect(
      await fixture.prisma.platformAppearanceSettings.findUniqueOrThrow({
        where: { id: 'global' },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { actorId, action: 'platform.appearance.update' },
      }),
    ).toBe(1);
  });
});
