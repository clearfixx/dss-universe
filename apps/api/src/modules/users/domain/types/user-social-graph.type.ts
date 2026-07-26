/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/user-social-graph.type.ts
 *
 * 🎯 Purpose:
 * Defines storage-neutral social graph summaries and paginated identifiers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

export type UserSocialGraphSummary = {
  userId: string;
  followerCount: number;
  followingCount: number;
};

export type UserFollowPage = PaginatedResult<string>;
