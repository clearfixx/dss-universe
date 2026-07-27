/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-activity-feed.service.ts
 *
 * 🎯 Purpose:
 * Applies profile privacy and block policy to projected user activity.
 *
 * 🧠 Responsibilities:
 * • verifies the activity owner exists;
 * • enforces profile and block visibility;
 * • delegates projection reads to the shared Activity module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ActivityFeedService } from '../../../activity';

import { UserBlockService } from './user-block.service';
import { UserPrivacyService } from './user-privacy.service';
import { UsersService } from './users.service';

@Injectable()
export class UserActivityFeedService {
  constructor(
    private readonly activity: ActivityFeedService,
    private readonly users: UsersService,
    private readonly privacy: UserPrivacyService,
    private readonly blocks: UserBlockService,
  ) {}

  async list(viewerId: string, userId: string, page?: number, limit?: number) {
    if (!(await this.users.exists(userId))) {
      throw new NotFoundException('Activity owner not found.');
    }
    if (
      viewerId !== userId &&
      (await this.blocks.isBlocked(viewerId, userId))
    ) {
      throw new ForbiddenException('User activity access is blocked.');
    }
    const visibility = await this.privacy.visibilityFor(userId, viewerId);
    if (viewerId !== userId && visibility.profileVisibility === 'PRIVATE') {
      throw new ForbiddenException('User activity is private.');
    }
    return this.activity.byActor(userId, page, limit);
  }
}

/**
 * The feed follows profile privacy; curiosity is not an authorization policy.
 */
