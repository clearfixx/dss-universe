import { Injectable } from '@nestjs/common';
import { ShellVariant, type PlatformAppearanceSettings } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

const GLOBAL_APPEARANCE_ID = 'global';

@Injectable()
export class AppearanceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async get(): Promise<PlatformAppearanceSettings> {
    const settings = await this.prisma.platformAppearanceSettings.findUnique({
      where: { id: GLOBAL_APPEARANCE_ID },
    });
    return settings ?? {
      id: GLOBAL_APPEARANCE_ID,
      activeShellVariant: ShellVariant.MODULE_LAUNCHER,
      updatedById: null,
      updatedAt: new Date(0),
    };
  }

  async update(actorId: string, variant: ShellVariant): Promise<PlatformAppearanceSettings> {
    return this.prisma.transaction(async (tx) => {
      const before = await tx.platformAppearanceSettings.findUnique({
        where: { id: GLOBAL_APPEARANCE_ID },
      });
      const result = await tx.platformAppearanceSettings.upsert({
        where: { id: GLOBAL_APPEARANCE_ID },
        create: {
          id: GLOBAL_APPEARANCE_ID,
          activeShellVariant: variant,
          updatedById: actorId,
        },
        update: {
          activeShellVariant: variant,
          updatedById: actorId,
        },
      });
      await this.audit.append(tx, {
        action: 'platform.appearance.update',
        actorType: 'USER',
        actorId,
        targetType: 'PlatformAppearanceSettings',
        targetId: GLOBAL_APPEARANCE_ID,
        metadata: {
          previousVariant: before?.activeShellVariant ?? ShellVariant.MODULE_LAUNCHER,
          activeShellVariant: variant,
        },
      });
      return result;
    });
  }
}
