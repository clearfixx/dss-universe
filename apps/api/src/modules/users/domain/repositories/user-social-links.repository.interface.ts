/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/repositories/user-social-links.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the persistence boundary for normalized profile social links.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  ReplaceUserSocialLink,
  UserSocialLink,
} from '../types/user-social-link.type';

export const USER_SOCIAL_LINKS_REPOSITORY = Symbol(
  'USER_SOCIAL_LINKS_REPOSITORY',
);

export interface UserSocialLinksRepository {
  findByUserIds(userIds: string[]): Promise<Map<string, UserSocialLink[]>>;
  replaceForUser(
    userId: string,
    links: ReplaceUserSocialLink[],
  ): Promise<UserSocialLink[]>;
}
