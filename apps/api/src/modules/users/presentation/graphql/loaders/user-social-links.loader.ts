/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/loaders/user-social-links.loader.ts
 *
 * 🎯 Purpose:
 * Batches public social-link reads across GraphQL user projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

import { UserSocialLinksService } from '../../../application/services/user-social-links.service';
import type { UserSocialLink } from '../../../domain/types/user-social-link.type';

@Injectable({ scope: Scope.REQUEST })
export class UserSocialLinksLoader extends DataLoader<
  string,
  UserSocialLink[]
> {
  constructor(service: UserSocialLinksService) {
    super(async (userIds) => {
      const byUser = await service.getManyByUserIds([...userIds]);
      return userIds.map((userId) => byUser.get(userId) ?? []);
    });
  }
}
