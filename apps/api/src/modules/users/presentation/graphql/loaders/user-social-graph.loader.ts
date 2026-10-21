/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/loaders/user-social-graph.loader.ts
 *
 * 🎯 Purpose:
 * Batches follower and following counters across GraphQL user projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

import { UserSocialGraphService } from '../../../application/services/user-social-graph.service';
import type { UserSocialGraphSummary } from '../../../domain/types/user-social-graph.type';

@Injectable({ scope: Scope.REQUEST })
export class UserSocialGraphLoader extends DataLoader<
  string,
  UserSocialGraphSummary
> {
  constructor(service: UserSocialGraphService) {
    super(async (userIds) => {
      const summaries = await service.summaries([...userIds]);
      return userIds.map(
        (userId) =>
          summaries.get(userId) ?? {
            userId,
            followerCount: 0,
            followingCount: 0,
          },
      );
    });
  }
}
