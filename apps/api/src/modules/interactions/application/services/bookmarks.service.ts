/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/bookmarks.service.ts
 *
 * 🎯 Purpose:
 * Coordinates private bookmark save, removal and listing use cases.
 *
 * 🧠 Responsibilities:
 * • asks target owners before creating saved-item relationships;
 * • permits owners to remove their private relationship at any time;
 * • scopes every list operation to the authenticated owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import {
  BOOKMARKS_REPOSITORY,
  type BookmarksRepository,
} from '../../domain/repositories/bookmarks.repository.interface';
import type {
  BookmarkMutationResult,
  BookmarkPage,
} from '../../domain/types/bookmark.type';
import { InteractionTargetsService } from './interaction-targets.service';

@Injectable()
export class BookmarksService {
  constructor(
    @Inject(BOOKMARKS_REPOSITORY)
    private readonly bookmarks: BookmarksRepository,
    private readonly targets: InteractionTargetsService,
  ) {}

  async save(
    ownerId: string,
    targetId: string,
  ): Promise<BookmarkMutationResult> {
    const decision = await this.targets.authorize(
      targetId,
      ownerId,
      'BOOKMARK',
    );
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Interaction target denied bookmark: ${
          decision.reason ?? 'POLICY_DENIED'
        }.`,
      );
    }
    return this.bookmarks.save(targetId, ownerId);
  }

  remove(ownerId: string, targetId: string): Promise<BookmarkMutationResult> {
    return this.bookmarks.remove(targetId, ownerId);
  }

  list(ownerId: string, page = 1, limit = 20): Promise<BookmarkPage> {
    return this.bookmarks.list(ownerId, page, limit);
  }
}

/**
 * Saving needs permission. Un-saving only needs ownership and a change of mind.
 */
