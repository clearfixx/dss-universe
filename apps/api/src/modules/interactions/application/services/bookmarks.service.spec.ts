/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/bookmarks.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies bookmark authorization, removal and private owner scoping.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ForbiddenException } from '@nestjs/common';

import type { BookmarksRepository } from '../../domain/repositories/bookmarks.repository.interface';
import type { Bookmark } from '../../domain/types/bookmark.type';
import type { InteractionTargetsService } from './interaction-targets.service';
import { BookmarksService } from './bookmarks.service';

describe('BookmarksService', () => {
  const bookmark: Bookmark = {
    id: 'bookmark-1',
    interactionTargetId: 'target-1',
    ownerId: 'owner-1',
    createdAt: new Date(),
  };
  let repository: jest.Mocked<BookmarksRepository>;
  let targets: jest.Mocked<InteractionTargetsService>;
  let service: BookmarksService;

  beforeEach(() => {
    repository = {
      save: jest
        .fn()
        .mockResolvedValue({ bookmark, saved: true, changed: true }),
      remove: jest
        .fn()
        .mockResolvedValue({ bookmark: null, saved: false, changed: true }),
      list: jest.fn().mockResolvedValue({
        items: [bookmark],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    };
    targets = {
      authorize: jest.fn().mockResolvedValue({
        target: {} as never,
        capability: 'BOOKMARK',
        allowed: true,
        reason: null,
      }),
    } as unknown as jest.Mocked<InteractionTargetsService>;
    service = new BookmarksService(repository, targets);
  });

  it('saves only after owner-module authorization', async () => {
    await service.save('owner-1', 'target-1');

    expect(targets.authorize.mock.calls).toEqual([
      ['target-1', 'owner-1', 'BOOKMARK'],
    ]);
    expect(repository.save.mock.calls).toEqual([['target-1', 'owner-1']]);
  });

  it('fails closed when the target owner denies bookmarks', async () => {
    targets.authorize.mockResolvedValue({
      target: {} as never,
      capability: 'BOOKMARK',
      allowed: false,
      reason: 'TARGET_LOCKED',
    });

    await expect(service.save('owner-1', 'target-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('removes the private relationship without target authorization', async () => {
    await service.remove('owner-1', 'target-1');

    expect(targets.authorize.mock.calls).toHaveLength(0);
    expect(repository.remove.mock.calls).toEqual([['target-1', 'owner-1']]);
  });

  it('always scopes lists to the authenticated owner', async () => {
    await service.list('owner-1', 2, 10);

    expect(repository.list.mock.calls).toEqual([['owner-1', 2, 10]]);
  });
});

/**
 * A private list has no “show everyone” checkbox. That is the feature.
 */
