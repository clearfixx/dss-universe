import { SHELL_VARIANTS as ShellVariant } from './domain/appearance.types';
import type { ShellVariant as ShellVariantType } from './domain/appearance.types';

import type { AuditWriterService } from '@api/core/audit';
import type { PrismaService } from '@api/core/database';

import { AppearanceRepository } from './infrastructure/appearance.repository';

describe('AppearanceRepository', () => {
  it('falls back to launcher when the singleton does not exist', async () => {
    const prisma = {
      platformAppearanceSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const repository = new AppearanceRepository(prisma, {} as AuditWriterService);
    await expect(repository.get()).resolves.toEqual({
      id: 'global',
      activeShellVariant: ShellVariant.MODULE_LAUNCHER,
      updatedById: null,
      updatedAt: new Date(0),
    });
  });

  it('writes the setting and audit in one transaction', async () => {
    const stored = {
      id: 'global',
      activeShellVariant: ShellVariant.HYBRID,
      updatedById: 'actor-1',
      updatedAt: new Date(),
    };
    const tx = {
      platformAppearanceSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(stored),
      },
    };
    const prisma = {
      transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    } as unknown as PrismaService;
    const audit = { append: jest.fn().mockResolvedValue('audit-1') };
    const repository = new AppearanceRepository(prisma, audit as unknown as AuditWriterService);
    await expect(repository.update('actor-1', ShellVariant.HYBRID)).resolves.toEqual(stored);
    expect(tx.platformAppearanceSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'global' },
      update: expect.objectContaining({ activeShellVariant: ShellVariant.HYBRID }),
    }));
    expect(audit.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        actorId: 'actor-1',
        action: 'platform.appearance.update',
        metadata: expect.objectContaining({
          activeShellVariant: ShellVariant.HYBRID,
          previousVariant: ShellVariant.MODULE_LAUNCHER,
        }),
      }),
    );
  });

  it('propagates audit failures so the transaction cannot silently succeed', async () => {
    const tx = {
      platformAppearanceSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
          activeShellVariant: ShellVariant.HYBRID,
        }),
      },
    };
    const prisma = {
      transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    } as unknown as PrismaService;
    const audit = { append: jest.fn().mockRejectedValue(new Error('audit unavailable')) };
    const repository = new AppearanceRepository(prisma, audit as unknown as AuditWriterService);
    await expect(repository.update('actor-1', ShellVariant.HYBRID)).rejects.toThrow('audit unavailable');
  });
});
