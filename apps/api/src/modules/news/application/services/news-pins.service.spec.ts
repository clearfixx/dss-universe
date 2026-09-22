import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { Permission, PermissionsService } from '@api/core/authorization';
import type { NewsPinsRepository } from '../../domain/repositories/news-pins.repository.interface';
import type { NewsPin } from '../../domain/types/news-pin.type';
import { NewsPinsService } from './news-pins.service';

describe('NewsPinsService', () => {
  const pin: NewsPin = {
    id: 'pin-1',
    articleId: 'article-1',
    scope: 'GLOBAL',
    categoryId: null,
    expiresAt: null,
    pinnedById: 'actor-1',
    createdAt: new Date('2026-09-22T10:00:00Z'),
    updatedAt: new Date('2026-09-22T10:00:00Z'),
  };
  const setPin = jest.fn();
  const repository = {
    set: setPin,
    remove: jest.fn(),
  } as jest.Mocked<NewsPinsRepository>;
  const permissions = {
    getAccessProfileByUserId: jest.fn(),
  } as unknown as jest.Mocked<PermissionsService>;
  const service = new NewsPinsService(repository, permissions);

  beforeEach(() => {
    jest.clearAllMocks();
    permissions.getAccessProfileByUserId.mockResolvedValue({
      roles: [],
      permissions: [Permission.NewsPinsManage],
    });
    setPin.mockResolvedValue(pin);
  });

  it('sets a global pin without a category', async () => {
    await expect(
      service.set({
        articleId: 'article-1',
        actorId: 'actor-1',
        scope: 'GLOBAL',
      }),
    ).resolves.toEqual(pin);
    expect(setPin).toHaveBeenCalledWith({
      articleId: 'article-1',
      actorId: 'actor-1',
      scope: 'GLOBAL',
      categoryId: null,
      expiresAt: null,
    });
  });

  it('requires an assigned category coordinate for category scope', async () => {
    await expect(
      service.set({
        articleId: 'article-1',
        actorId: 'actor-1',
        scope: 'CATEGORY',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(setPin).not.toHaveBeenCalled();
  });

  it('rejects expired pin windows', async () => {
    await expect(
      service.set({
        articleId: 'article-1',
        actorId: 'actor-1',
        scope: 'GLOBAL',
        expiresAt: new Date('2000-01-01T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('denies actors without the dedicated permission', async () => {
    permissions.getAccessProfileByUserId.mockResolvedValue({
      roles: [],
      permissions: [],
    });
    await expect(
      service.set({
        articleId: 'article-1',
        actorId: 'actor-1',
        scope: 'GLOBAL',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports removal of a missing pin', async () => {
    repository.remove.mockResolvedValue(false);
    await expect(service.remove('article-1', 'actor-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
