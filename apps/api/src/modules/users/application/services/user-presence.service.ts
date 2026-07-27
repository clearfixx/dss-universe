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
 * • maintains short-lived guest and crawler aggregates;
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
import type { PresenceSummary } from '../../domain/types/presence-summary.type';
import { UserPrivacyService } from './user-privacy.service';

const PRESENCE_TTL_SECONDS = 300;
const ACTIVE_USERS_KEY = 'dss:presence:users';
const ACTIVE_GUESTS_KEY = 'dss:presence:guests';
const ACTIVE_CRAWLERS_KEY = 'dss:presence:crawlers';
const CRAWLER_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|google-inspectiontool|lighthouse/i;

@Injectable()
export class UserPresenceService {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly privacy: UserPrivacyService,
  ) {}

  async touch(userId: string, previousGuestId?: string): Promise<void> {
    const now = Date.now();
    if (previousGuestId) {
      await this.redis.zrem(ACTIVE_GUESTS_KEY, previousGuestId);
    }
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

  async touchAnonymous(visitorId: string, userAgent: string): Promise<void> {
    const key = this.isCrawler(userAgent)
      ? ACTIVE_CRAWLERS_KEY
      : ACTIVE_GUESTS_KEY;
    await this.redis.zadd(
      key,
      Date.now() + PRESENCE_TTL_SECONDS * 1000,
      visitorId,
    );
  }

  async summary(viewerId: string): Promise<PresenceSummary> {
    const now = Date.now();
    await Promise.all(
      [ACTIVE_USERS_KEY, ACTIVE_GUESTS_KEY, ACTIVE_CRAWLERS_KEY].map((key) =>
        this.redis.zremrangebyscore(key, '-inf', now),
      ),
    );
    const [activeUserIds, onlineGuests, onlineCrawlers] = await Promise.all([
      this.redis.zrangebyscore(
        ACTIVE_USERS_KEY,
        now,
        '+inf',
        'LIMIT',
        0,
        10000,
      ),
      this.redis.zcard(ACTIVE_GUESTS_KEY),
      this.redis.zcard(ACTIVE_CRAWLERS_KEY),
    ]);
    const visibleMembers = await this.visibleStatuses(activeUserIds, viewerId);
    const onlineMembers = [...visibleMembers.values()].filter(Boolean).length;

    return {
      onlineMembers,
      onlineGuests,
      onlineCrawlers,
      totalOnline: onlineMembers + onlineGuests + onlineCrawlers,
      sampledAt: new Date(now),
    };
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

  async visibleOnlineUserIds(viewerId: string): Promise<string[]> {
    const now = Date.now();
    await this.redis.zremrangebyscore(ACTIVE_USERS_KEY, '-inf', now);
    const activeIds = await this.redis.zrangebyscore(
      ACTIVE_USERS_KEY,
      now,
      '+inf',
      'LIMIT',
      0,
      10000,
    );
    const statuses = await this.visibleStatuses(activeIds, viewerId);
    return activeIds.filter((userId) => statuses.get(userId) === true);
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

  private isCrawler(userAgent: string): boolean {
    return CRAWLER_PATTERN.test(userAgent);
  }
}

/**
 * 🛰️ Presence expires quickly. The Universe remembers contributions, not
 * every anonymous footstep.
 */
