/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-privacy.service.ts
 *
 * 🎯 Purpose:
 * Evaluates and updates owner-controlled profile privacy policy.
 *
 * 🧠 Responsibilities:
 * • supplies privacy-safe defaults when no record exists;
 * • keeps owner access unconditional;
 * • evaluates field visibility for authenticated profile viewers;
 * • applies the same viewer policy to single and batched profile reads;
 * • persists complete settings through the privacy repository.
 *
 * 🏗️ Architecture:
 * Users-owned application policy; single and batch reads share one evaluator.
 *
 * ⚠️ Important:
 * Missing settings use established defaults; failed reads never become defaults.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PRIVACY_REPOSITORY,
  type UserPrivacyRepository,
} from '../../domain/repositories/user-privacy.repository.interface';
import type {
  UpdateUserPrivacySettings,
  UserPrivacySettings,
} from '../../domain/types/user-privacy-settings.type';

export const DEFAULT_USER_PRIVACY_SETTINGS: UpdateUserPrivacySettings = {
  profileVisibility: 'PUBLIC',
  showLocation: true,
  showWebsite: true,
  showSocialLinks: true,
  showLastSeen: false,
  showOnlineStatus: true,
  allowFollowers: true,
  showFollows: true,
  allowWallPosts: true,
};

@Injectable()
export class UserPrivacyService {
  constructor(
    @Inject(USER_PRIVACY_REPOSITORY)
    private readonly privacy: UserPrivacyRepository,
  ) {}

  async get(userId: string): Promise<UserPrivacySettings> {
    return (
      (await this.privacy.findByUserId(userId)) ?? {
        userId,
        ...DEFAULT_USER_PRIVACY_SETTINGS,
      }
    );
  }

  async getMany(userIds: string[]): Promise<Map<string, UserPrivacySettings>> {
    const uniqueIds = [...new Set(userIds)];
    const records = await this.privacy.findManyByUserIds(uniqueIds);
    const byUserId = new Map(records.map((record) => [record.userId, record]));

    return new Map(
      uniqueIds.map((userId) => [
        userId,
        byUserId.get(userId) ?? {
          userId,
          ...DEFAULT_USER_PRIVACY_SETTINGS,
        },
      ]),
    );
  }

  update(
    userId: string,
    settings: UpdateUserPrivacySettings,
  ): Promise<UserPrivacySettings> {
    return this.privacy.upsert(userId, settings);
  }

  async visibilityFor(
    userId: string,
    viewerId?: string,
  ): Promise<UserPrivacySettings> {
    const settings = await this.get(userId);
    return this.resolveVisibility(settings, viewerId);
  }

  async visibilityForMany(
    userIds: string[],
    viewerId?: string,
  ): Promise<Map<string, UserPrivacySettings>> {
    if (userIds.length === 0) return new Map();
    const settings = await this.getMany(userIds);
    return new Map(
      [...settings].map(([userId, policy]) => [
        userId,
        this.resolveVisibility(policy, viewerId),
      ]),
    );
  }

  private resolveVisibility(
    settings: UserPrivacySettings,
    viewerId?: string,
  ): UserPrivacySettings {
    if (settings.userId === viewerId) {
      return {
        ...settings,
        showLocation: true,
        showWebsite: true,
        showSocialLinks: true,
        showLastSeen: true,
        showOnlineStatus: true,
        allowFollowers: true,
        showFollows: true,
        allowWallPosts: true,
      };
    }
    if (
      settings.profileVisibility === 'PRIVATE' ||
      (settings.profileVisibility === 'MEMBERS' && !viewerId)
    ) {
      return {
        ...settings,
        showLocation: false,
        showWebsite: false,
        showSocialLinks: false,
        showLastSeen: false,
        showOnlineStatus: false,
        showFollows: false,
        allowWallPosts: false,
      };
    }
    return settings;
  }
}
