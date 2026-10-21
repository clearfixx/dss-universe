import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { PermissionsService } from '@api/core/authorization';
import type { NewsSettingsRepository } from '../../domain/repositories/news-settings.repository.interface';
import type { NewsSettings } from '../../domain/types/news-settings.type';
import { NewsSettingsService } from './news-settings.service';

describe('NewsSettingsService', () => {
  const settings: NewsSettings = {
    newsPaginationMode: 'BOTH',
    newsPaginationThreshold: 12,
    newsPageSize: 12,
    commentsPaginationMode: 'BOTH',
    commentsPaginationThreshold: 20,
    commentsPageSize: 20,
    updatedAt: new Date(),
  };
  let repository: jest.Mocked<NewsSettingsRepository>;
  let permissions: Pick<PermissionsService, 'getAccessProfileByUserId'>;
  let update: jest.Mock;
  let access: jest.Mock;
  let service: NewsSettingsService;

  beforeEach(() => {
    update = jest.fn().mockResolvedValue(settings);
    repository = { get: jest.fn().mockResolvedValue(settings), update };
    access = jest.fn().mockResolvedValue({ roles: [], permissions: [] });
    permissions = { getAccessProfileByUserId: access };
    service = new NewsSettingsService(
      repository,
      permissions as PermissionsService,
    );
  });

  it('returns the public presentation policy', async () => {
    await expect(service.settings()).resolves.toBe(settings);
  });

  it('requires the narrow settings permission', async () => {
    await expect(service.update('actor-1', settings)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('validates and persists all pagination modes together', async () => {
    access.mockResolvedValue({
      roles: [],
      permissions: ['news.settings.manage'],
    });
    await service.update('actor-1', {
      ...settings,
      newsPaginationMode: 'PAGES',
      commentsPaginationMode: 'LOAD_MORE',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'actor-1',
        newsPaginationMode: 'PAGES',
        commentsPaginationMode: 'LOAD_MORE',
      }),
    );
  });

  it('rejects unsafe page sizes', async () => {
    access.mockResolvedValue({
      roles: [],
      permissions: ['news.settings.manage'],
    });
    await expect(
      service.update('actor-1', { ...settings, commentsPageSize: 101 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
