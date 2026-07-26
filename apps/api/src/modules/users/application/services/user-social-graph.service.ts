/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-social-graph.service.ts
 *
 * 🎯 Purpose:
 * Coordinates follow commands, privacy enforcement, summaries, and lists.
 *
 * 🧠 Responsibilities:
 * • rejects self-follow and missing targets;
 * • enforces target follow and list privacy;
 * • exposes batched summaries and ordered paginated user projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';

import type { PaginatedResult } from '@api/shared';

import {
  USER_SOCIAL_GRAPH_REPOSITORY,
  type UserSocialGraphRepository,
} from '../../domain/repositories/user-social-graph.repository.interface';
import type { UserSocialGraphSummary } from '../../domain/types/user-social-graph.type';
import type { UserResponseDto } from '../dto';
import { UserPrivacyService } from './user-privacy.service';
import { UsersService } from './users.service';
import { UserBlockService } from './user-block.service';

@Injectable()
export class UserSocialGraphService {
  constructor(
    @Inject(USER_SOCIAL_GRAPH_REPOSITORY)
    private readonly graph: UserSocialGraphRepository,
    private readonly users: UsersService,
    private readonly privacy: UserPrivacyService,
    private readonly blocks: UserBlockService,
  ) {}

  async follow(
    actorId: string,
    targetId: string,
  ): Promise<UserSocialGraphSummary> {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot follow yourself.');
    }
    if (!(await this.users.exists(targetId))) {
      throw new BadRequestException('The user to follow does not exist.');
    }
    if (await this.blocks.isBlocked(actorId, targetId)) {
      throw new ForbiddenException(
        'This follow is not allowed because a user block exists.',
      );
    }
    if (!(await this.privacy.get(targetId)).allowFollowers) {
      throw new ForbiddenException('This user is not accepting followers.');
    }
    await this.graph.follow(actorId, targetId);
    return this.summary(targetId);
  }

  async unfollow(
    actorId: string,
    targetId: string,
  ): Promise<UserSocialGraphSummary> {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot unfollow yourself.');
    }
    await this.graph.unfollow(actorId, targetId);
    return this.summary(targetId);
  }

  async summary(userId: string): Promise<UserSocialGraphSummary> {
    const summaries = await this.graph.summaries([userId]);
    return (
      summaries.get(userId) ?? {
        userId,
        followerCount: 0,
        followingCount: 0,
      }
    );
  }

  summaries(userIds: string[]): Promise<Map<string, UserSocialGraphSummary>> {
    return this.graph.summaries(userIds);
  }

  followers(
    userId: string,
    viewerId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.list('followers', userId, viewerId, page, limit);
  }

  following(
    userId: string,
    viewerId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.list('following', userId, viewerId, page, limit);
  }

  private async list(
    direction: 'followers' | 'following',
    userId: string,
    viewerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const visibility = await this.privacy.visibilityFor(userId, viewerId);
    if (!visibility.showFollows) {
      throw new ForbiddenException('This social graph is private.');
    }
    const result = await this.graph[direction](userId, page, limit);
    const users = await this.users.getManyByIds(result.items);
    const byId = new Map(users.map((user) => [user.id, user]));
    return {
      ...result,
      items: result.items.flatMap((id) => {
        const user = byId.get(id);
        return user ? [user] : [];
      }),
    };
  }
}
