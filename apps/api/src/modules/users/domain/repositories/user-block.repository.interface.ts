/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/repositories/user-block.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines reversible user blocks and centralized relationship enforcement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserFollowPage } from '../types/user-social-graph.type';

export const USER_BLOCK_REPOSITORY = Symbol('USER_BLOCK_REPOSITORY');

export interface UserBlockRepository {
  block(blockerId: string, blockedId: string): Promise<void>;
  unblock(blockerId: string, blockedId: string): Promise<void>;
  existsEitherDirection(userId: string, otherUserId: string): Promise<boolean>;
  blockedUsers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage>;
}
