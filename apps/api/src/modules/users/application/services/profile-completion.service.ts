/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/profile-completion.service.ts
 *
 * 🎯 Purpose:
 * Calculates owner profile completion from canonical profile data.
 *
 * 🧠 Responsibilities:
 * • evaluates the stable profile checklist;
 * • includes normalized social links without duplicating persistence;
 * • returns a deterministic, always-current completion result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import {
  PROFILE_COMPLETION_FIELDS,
  type ProfileCompletion,
  type ProfileCompletionField,
} from '../../domain/types/profile-completion.type';
import { UserSocialLinksService } from './user-social-links.service';
import { UsersService } from './users.service';

@Injectable()
export class ProfileCompletionService {
  constructor(
    private readonly users: UsersService,
    private readonly socialLinks: UserSocialLinksService,
  ) {}

  async getForUser(userId: string): Promise<ProfileCompletion> {
    const [user, linksByUser] = await Promise.all([
      this.users.getById(userId),
      this.socialLinks.getManyByUserIds([userId]),
    ]);
    const completed = new Set<ProfileCompletionField>();

    if (user.avatarUrl) completed.add('AVATAR');
    if (user.coverUrl) completed.add('COVER');
    if (user.bio) completed.add('BIO');
    if (user.location) completed.add('LOCATION');
    if (user.website) completed.add('WEBSITE');
    if (user.technologies.length > 0) completed.add('TECHNOLOGIES');
    if (user.interests.length > 0) completed.add('INTERESTS');
    if ((linksByUser.get(userId)?.length ?? 0) > 0) {
      completed.add('SOCIAL_LINKS');
    }

    const completedFields = PROFILE_COMPLETION_FIELDS.filter((field) =>
      completed.has(field),
    );
    const missingFields = PROFILE_COMPLETION_FIELDS.filter(
      (field) => !completed.has(field),
    );
    const completedCount = completedFields.length;
    const totalCount = PROFILE_COMPLETION_FIELDS.length;

    return {
      percentage: Math.round((completedCount / totalCount) * 100),
      completedCount,
      totalCount,
      isComplete: completedCount === totalCount,
      completedFields,
      missingFields,
    };
  }
}

/**
 * 🧭 A useful progress meter points to the next step; it never invents progress.
 */
