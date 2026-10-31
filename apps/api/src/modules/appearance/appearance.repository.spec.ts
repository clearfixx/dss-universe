import type { AuditWriterService } from '@api/core/audit';
import type { PrismaService, TransactionClient } from '@api/core/database';

import { SHELL_VARIANTS } from './domain/appearance.types';
import { AppearanceRepository } from './infrastructure/appearance.repository';

describe('AppearanceRepository', () => {
  it('falls back to launcher when the singleton does not exist', async () => {
    const prisma = {
      platformAppearanceSettings: {
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaService;
    const repository = new AppearanceRepository(
      prisma,
      {} as AuditWriterService,
    );

    await expect(repository.get()).resolves.toEqual({
      id: 'global',
      activeShellVariant: SHELL_VARIANTS.MODULE_LAUNCHER,
      updatedById: null,
      updatedAt: new Date(0),
    });
  });

  it('writes the setting and audit in one transaction', async () => {
    const stored = {
      id: 'global',
      activeShellVariant: SHELL_VARIANTS.HYBRID,
      updatedById: 'actor-1',
      updatedAt: new Date(),
    };
    let auditAction: string | undefined;
    const upsert = jest.fn().mockResolvedValue(stored);
    const tx = {
      platformAppearanceSettings: {
        findUnique: () => Promise.resolve(null),
        upsert,
      },
    } as unknown as TransactionClient;
    const prisma = {
      transaction: <T>(callback: (client: TransactionClient) => Promise<T>) =>
        callback(tx),
    } as unknown as PrismaService;
    const audit = {
      append: (_client: TransactionClient, entry: { action: string }) => {
        auditAction = entry.action;
        return Promise.resolve('audit-1');
      },
    } as unknown as AuditWriterService;
    const repository = new AppearanceRepository(prisma, audit);

    await expect(
      repository.update('actor-1', SHELL_VARIANTS.HYBRID),
    ).resolves.toEqual(stored);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(auditAction).toBe('platform.appearance.update');
  });

  it('propagates audit failures so transactions cannot silently succeed', async () => {
    const tx = {
      platformAppearanceSettings: {
        findUnique: () => Promise.resolve(null),
        upsert: () =>
          Promise.resolve({
            activeShellVariant: SHELL_VARIANTS.HYBRID,
          }),
      },
    } as unknown as TransactionClient;
    const prisma = {
      transaction: <T>(callback: (client: TransactionClient) => Promise<T>) =>
        callback(tx),
    } as unknown as PrismaService;
    const audit = {
      append: () => {
        return Promise.reject(new Error('audit unavailable'));
      },
    } as unknown as AuditWriterService;
    const repository = new AppearanceRepository(prisma, audit);

    await expect(
      repository.update('actor-1', SHELL_VARIANTS.HYBRID),
    ).rejects.toThrow('audit unavailable');
  });
});
