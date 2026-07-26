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
 * • persists complete settings through the privacy repository.
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

  update(
    userId: string,
    settings: UpdateUserPrivacySettings,
  ): Promise<UserPrivacySettings> {
    return this.privacy.upsert(userId, settings);
  }

  async visibilityFor(
    userId: string,
    viewerId: string,
  ): Promise<UserPrivacySettings> {
    const settings = await this.get(userId);
    if (userId === viewerId) {
      return {
        ...settings,
        showLocation: true,
        showWebsite: true,
        showSocialLinks: true,
        showLastSeen: true,
        showOnlineStatus: true,
        allowFollowers: true,
        showFollows: true,
      };
    }
    if (settings.profileVisibility === 'PRIVATE') {
      return {
        ...settings,
        showLocation: false,
        showWebsite: false,
        showSocialLinks: false,
        showLastSeen: false,
        showOnlineStatus: false,
        showFollows: false,
      };
    }
    return settings;
  }
}
