import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SHELL_VARIANTS as ShellVariant } from './domain/appearance.types';
import type { ShellVariant as ShellVariantType } from './domain/appearance.types';

import type { PermissionsService } from '@api/core/authorization';

import { AppearanceService } from './appearance.service';
import type { AppearanceRepositoryPort } from './domain/appearance.repository.port';

describe('AppearanceService', () => {
  const defaultSettings = {
    id: 'global',
    activeShellVariant: ShellVariant.MODULE_LAUNCHER,
    updatedById: null,
    updatedAt: new Date(0),
  };
  let get: jest.Mock;
  let update: jest.Mock;
  let access: jest.Mock;
  let service: AppearanceService;

  beforeEach(() => {
    get = jest.fn().mockResolvedValue(defaultSettings);
    update = jest.fn().mockResolvedValue(defaultSettings);
    access = jest.fn().mockResolvedValue({ roles: [], permissions: [] });
    service = new AppearanceService(
      { get, update } as AppearanceRepositoryPort,
      { getAccessProfileByUserId: access } as unknown as PermissionsService,
    );
  });

  it('returns the configured shell variant', async () => {
    await expect(service.get()).resolves.toEqual(defaultSettings);
  });

  it('requires system settings permission before writes', async () => {
    await expect(
      service.update('u1', ShellVariant.HYBRID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts only supported enum variants', async () => {
    await expect(
      service.update('u1', '#FF00FF' as ShellVariantType),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('persists validated variants for authorized actors', async () => {
    access.mockResolvedValue({
      roles: [],
      permissions: ['system.settings.update'],
    });
    await service.update('u1', ShellVariant.HORIZONTAL_NAVIGATION);
    expect(update).toHaveBeenCalledWith('u1', ShellVariant.HORIZONTAL_NAVIGATION);
  });
});
