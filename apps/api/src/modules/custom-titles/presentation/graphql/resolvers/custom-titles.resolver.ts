/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/resolvers/custom-titles.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes title discovery, administration, grants, and self-selection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { CustomTitlesService } from '../../../application/services/custom-titles.service';
import type {
  CustomTitle,
  CustomTitleSettings,
  UserTitleGrant,
} from '../../../domain/types/custom-titles.type';
import { CreateCustomTitleInput } from '../inputs/create-custom-title.input';
import { GrantCustomTitleInput } from '../inputs/grant-custom-title.input';
import { RevokeCustomTitleInput } from '../inputs/revoke-custom-title.input';
import { UpdateCustomTitleSettingsInput } from '../inputs/update-custom-title-settings.input';
import { UpdateCustomTitleInput } from '../inputs/update-custom-title.input';
import {
  CustomTitleModel,
  CustomTitleSettingsModel,
  UserTitleGrantModel,
} from '../models/custom-titles.model';

@Resolver()
export class CustomTitlesResolver {
  constructor(private readonly titles: CustomTitlesService) {}

  @Query(() => [CustomTitleModel])
  @UseGuards(JwtAuthGuard)
  customTitles(): Promise<CustomTitle[]> {
    return this.titles.definitions();
  }

  @Query(() => [CustomTitleModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CustomTitlesManage)
  customTitlesAdmin(): Promise<CustomTitle[]> {
    return this.titles.definitions(true);
  }

  @Query(() => [UserTitleGrantModel])
  @UseGuards(JwtAuthGuard)
  userCustomTitles(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<UserTitleGrant[]> {
    return this.titles.grants(userId);
  }

  @Query(() => CustomTitleSettingsModel)
  @UseGuards(JwtAuthGuard)
  customTitleSettings(): Promise<CustomTitleSettings> {
    return this.titles.settings();
  }

  @Mutation(() => CustomTitleModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CustomTitlesManage)
  createCustomTitle(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateCustomTitleInput,
  ): Promise<CustomTitle> {
    return this.titles.create(input, actor.id);
  }

  @Mutation(() => CustomTitleModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CustomTitlesManage)
  updateCustomTitle(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: UpdateCustomTitleInput,
  ): Promise<CustomTitle> {
    return this.titles.update(input, actor.id);
  }

  @Mutation(() => UserTitleGrantModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CustomTitlesManage)
  grantCustomTitle(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: GrantCustomTitleInput,
  ): Promise<UserTitleGrant> {
    return this.titles.grant(
      input.userId,
      input.titleId,
      input.reason,
      actor.id,
    );
  }

  @Mutation(() => UserTitleGrantModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CustomTitlesManage)
  revokeCustomTitle(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: RevokeCustomTitleInput,
  ): Promise<UserTitleGrant> {
    return this.titles.revoke(input.grantId, input.reason, actor.id);
  }

  @Mutation(() => UserTitleGrantModel)
  @UseGuards(JwtAuthGuard)
  selectCustomTitle(
    @AuthUser() actor: AuthenticatedUser,
    @Args('grantId', { type: () => ID }) grantId: string,
  ): Promise<UserTitleGrant> {
    return this.titles.select(actor.id, grantId);
  }

  @Mutation(() => CustomTitleSettingsModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CustomTitlesSettingsManage)
  updateCustomTitleSettings(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: UpdateCustomTitleSettingsInput,
  ): Promise<CustomTitleSettings> {
    return this.titles.updateSettings(input.selectionCooldownDays, actor.id);
  }
}

/**
 * Users choose the badge. Guards choose who may mint one.
 */
