/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-presence.service.ts
 *
 * 🎯 Purpose:
 * Maintains ephemeral user presence and exposes privacy-aware online status.
 *
 * 🧠 Responsibilities:
 * • refreshes Redis TTL presence for authenticated activity;
 * • throttles durable last-seen updates;
 * • batches online lookups;
 * • enforces owner-controlled online-status privacy.
 *
 * ⚠️ Important:
 * Presence is an ephemeral secondary effect. Redis failures must never make
 * authenticated product operations fail.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import type IORedis from 'ioredis';

import { REDIS_CONNECTION } from '@api/core/cache';

import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository.interface';
import { UserPrivacyService } from './user-privacy.service';

const PRESENCE_TTL_SECONDS = 300;
const ACTIVE_USERS_KEY = 'dss:presence:users';

@Injectable()
export class UserPresenceService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly privacy: UserPrivacyService,
  ) {}

  async touch(userId: string): Promise<void> {
    const now = Date.now();
    await this.redis.zadd(
      ACTIVE_USERS_KEY,
      now + PRESENCE_TTL_SECONDS * 1000,
      userId,
    );
    const shouldPersist = await this.redis.set(
      this.lastSeenThrottleKey(userId),
      String(now),
      'EX',
      PRESENCE_TTL_SECONDS,
      'NX',
    );

    if (shouldPersist === 'OK') {
      await this.users.updateById(userId, { lastSeenAt: new Date(now) });
    }
  }

  async visibleStatuses(
    userIds: string[],
    viewerId: string,
  ): Promise<Map<string, boolean>> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return new Map();

    const [online, privacy] = await Promise.all([
      this.onlineStatuses(uniqueIds),
      this.privacy.getMany(uniqueIds),
    ]);

    return new Map(
      uniqueIds.map((userId) => {
        const settings = privacy.get(userId);
        const visible =
          userId === viewerId ||
          (settings?.profileVisibility !== 'PRIVATE' &&
            settings?.showOnlineStatus === true);
        return [userId, visible && online.get(userId) === true];
      }),
    );
  }

  private async onlineStatuses(
    userIds: string[],
  ): Promise<Map<string, boolean>> {
    const now = Date.now();
    await this.redis.zremrangebyscore(ACTIVE_USERS_KEY, '-inf', now);
    const scores = await this.redis.zmscore(ACTIVE_USERS_KEY, ...userIds);

    return new Map(
      userIds.map((userId, index) => [userId, scores[index] !== null]),
    );
  }

  private lastSeenThrottleKey(userId: string): string {
    return `dss:presence:last-seen:${userId}`;
  }
}
