/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/repositories/user-social-graph.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines idempotent follow persistence and batched social graph reads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  UserFollowPage,
  UserSocialGraphSummary,
} from '../types/user-social-graph.type';

export const USER_SOCIAL_GRAPH_REPOSITORY = Symbol(
  'USER_SOCIAL_GRAPH_REPOSITORY',
);

export interface UserSocialGraphRepository {
  follow(actorId: string, targetId: string): Promise<void>;
  unfollow(actorId: string, targetId: string): Promise<void>;
  isFollowing(actorId: string, targetId: string): Promise<boolean>;
  summaries(userIds: string[]): Promise<Map<string, UserSocialGraphSummary>>;
  followers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage>;
  following(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage>;
}
