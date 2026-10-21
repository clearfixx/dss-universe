/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/bookmarks.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated private bookmark commands and listing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { BookmarksService } from '../../../application/services/bookmarks.service';
import type {
  Bookmark,
  BookmarkMutationResult,
} from '../../../domain/types/bookmark.type';
import { BookmarksPageInput } from '../inputs/bookmark.input';
import {
  BookmarkModel,
  BookmarkMutationPayloadModel,
  BookmarkPageModel,
} from '../models/bookmark.model';

@Resolver(() => BookmarkModel)
@UseGuards(JwtAuthGuard)
export class BookmarksResolver {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Mutation(() => BookmarkMutationPayloadModel)
  async saveBookmark(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
  ): Promise<BookmarkMutationPayloadModel> {
    return this.toPayload(
      await this.bookmarks.save(actor.id, interactionTargetId),
    );
  }

  @Mutation(() => BookmarkMutationPayloadModel)
  async removeBookmark(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
  ): Promise<BookmarkMutationPayloadModel> {
    return this.toPayload(
      await this.bookmarks.remove(actor.id, interactionTargetId),
    );
  }

  @Query(() => BookmarkPageModel)
  async viewerBookmarks(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pagination', { nullable: true })
    pagination?: BookmarksPageInput,
  ): Promise<BookmarkPageModel> {
    const result = await this.bookmarks.list(
      actor.id,
      pagination?.page,
      pagination?.limit,
    );
    return {
      ...result,
      items: result.items.map((bookmark) => this.toModel(bookmark)),
    };
  }

  private toPayload(
    result: BookmarkMutationResult,
  ): BookmarkMutationPayloadModel {
    return {
      ...result,
      bookmark: result.bookmark ? this.toModel(result.bookmark) : null,
    };
  }

  private toModel(bookmark: Bookmark): BookmarkModel {
    return {
      id: bookmark.id,
      interactionTargetId: bookmark.interactionTargetId,
      createdAt: bookmark.createdAt.toISOString(),
    };
  }
}

/**
 * The resolver knows the viewer; no caller gets to nominate another owner.
 */
