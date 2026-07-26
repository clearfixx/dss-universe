/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-social-links.service.ts
 *
 * 🎯 Purpose:
 * Coordinates normalized owner-controlled profile social links.
 *
 * 🧠 Responsibilities:
 * • normalizes platform, label, and URL values;
 * • rejects duplicate platforms before persistence;
 * • exposes batched public reads and owner replacement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  USER_SOCIAL_LINKS_REPOSITORY,
  type UserSocialLinksRepository,
} from '../../domain/repositories/user-social-links.repository.interface';
import type { UserSocialLink } from '../../domain/types/user-social-link.type';

export type SocialLinkData = {
  platform: string;
  label?: string | null;
  url: string;
};

@Injectable()
export class UserSocialLinksService {
  constructor(
    @Inject(USER_SOCIAL_LINKS_REPOSITORY)
    private readonly links: UserSocialLinksRepository,
  ) {}

  async getManyByUserIds(
    userIds: string[],
  ): Promise<Map<string, UserSocialLink[]>> {
    return this.links.findByUserIds([...new Set(userIds)]);
  }

  replace(userId: string, values: SocialLinkData[]): Promise<UserSocialLink[]> {
    const platforms = new Set<string>();
    const normalized = values.map((value, position) => {
      const platform = value.platform.trim().toLocaleLowerCase('en-US');
      if (platforms.has(platform)) {
        throw new BadRequestException(
          `Social platform "${platform}" may only appear once.`,
        );
      }
      platforms.add(platform);
      const label = value.label?.trim();
      return {
        platform,
        label: label && label.length > 0 ? label : null,
        url: value.url.trim(),
        position,
      };
    });
    return this.links.replaceForUser(userId, normalized);
  }
}
