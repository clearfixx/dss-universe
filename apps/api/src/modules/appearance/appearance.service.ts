import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { Permission, PermissionsService } from '@api/core/authorization';

import { AppearanceRepository } from './infrastructure/appearance.repository';
import {
  SHELL_VARIANTS,
  type AppearanceSettings,
  type ShellVariant,
} from './domain/appearance.types';

@Injectable()
export class AppearanceService {
  constructor(
    private readonly repository: AppearanceRepository,
    private readonly permissions: PermissionsService,
  ) {}

  get(): Promise<AppearanceSettings> {
    return this.repository.get();
  }

  async update(actorId: string, variant: ShellVariant): Promise<AppearanceSettings> {
    if (!Object.values(SHELL_VARIANTS).includes(variant)) {
      throw new BadRequestException('Unsupported Shell Variant.');
    }
    const access = await this.permissions.getAccessProfileByUserId(actorId);
    if (!access.permissions.includes(Permission.SystemSettingsUpdate)) {
      throw new ForbiddenException('Insufficient permissions.');
    }
    return this.repository.update(actorId, variant);
  }
}
