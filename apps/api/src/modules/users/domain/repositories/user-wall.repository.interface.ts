/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/repositories/user-wall.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence operations for Profile Wall posts and tombstones.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

import type {
  CreateUserWallPost,
  UserWallPost,
} from '../types/user-wall-post.type';

export const USER_WALL_REPOSITORY = Symbol('USER_WALL_REPOSITORY');

export interface UserWallRepository {
  create(input: CreateUserWallPost): Promise<UserWallPost>;
  findById(id: string): Promise<UserWallPost | null>;
  list(
    profileOwnerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserWallPost>>;
  isAttachableImage(mediaId: string, ownerId: string): Promise<boolean>;
  tombstone(
    postId: string,
    deletedById: string,
    reason: string | null,
  ): Promise<UserWallPost>;
}

/**
 * Repository reminder: hiding public content is reversible; deleting evidence
 * is not part of this contract.
 */
