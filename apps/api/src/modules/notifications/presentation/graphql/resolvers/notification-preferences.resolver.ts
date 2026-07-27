/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/presentation/graphql/resolvers/notification-preferences.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes owner-only notification preferences through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { NotificationPreferencesService } from '../../../application/services/notification-preferences.service';
import type { NotificationPreferences } from '../../../domain/types/notification-preferences.type';
import { UpdateNotificationPreferencesInput } from '../inputs/update-notification-preferences.input';
import { NotificationPreferencesModel } from '../models/notification-preferences.model';

@Resolver()
export class NotificationPreferencesResolver {
  constructor(private readonly preferences: NotificationPreferencesService) {}

  @Query(() => NotificationPreferencesModel)
  @UseGuards(JwtAuthGuard)
  viewerNotificationPreferences(
    @AuthUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferences> {
    return this.preferences.get(user.id);
  }

  @Mutation(() => NotificationPreferencesModel)
  @UseGuards(JwtAuthGuard)
  updateViewerNotificationPreferences(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    return this.preferences.update(user.id, input);
  }
}

/**
 * Thin resolver, loud notifications, quiet architecture.
 */
