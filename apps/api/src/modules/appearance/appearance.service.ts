import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ShellVariant, type PlatformAppearanceSettings } from '@prisma/client';

import { Permission, PermissionsService } from '@api/core/authorization';

import { AppearanceRepository } from './appearance.repository';

@Injectable()
export class AppearanceService {
  constructor(
    private readonly repository: AppearanceRepository,
    private readonly permissions: PermissionsService,
  ) {}

  get(): Promise<PlatformAppearanceSettings> {
    return this.repository.get();
  }

  async update(actorId: string, variant: ShellVariant): Promise<PlatformAppearanceSettings> {
    if (!Object.values(ShellVariant).includes(variant)) {
      throw new BadRequestException('Unsupported Shell Variant.');
    }
    const access = await this.permissions.getAccessProfileByUserId(actorId);
    if (!access.permissions.includes(Permission.SystemSettingsUpdate)) {
      throw new ForbiddenException('Insufficient permissions.');
    }
    return this.repository.update(actorId, variant);
  }
}
