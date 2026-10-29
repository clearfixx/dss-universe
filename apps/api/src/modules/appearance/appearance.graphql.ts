import { UseGuards } from '@nestjs/common';
import {
  Field,
  GraphQLISODateTime,
  Mutation,
  ObjectType,
  Query,
  Args,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { Permission, PermissionsGuard, RequirePermissions } from '@api/core/authorization';

import { AppearanceService } from './appearance.service';
import {
  SHELL_VARIANTS,
  type ShellVariant,
  type AppearanceSettings,
} from './domain/appearance.types';

registerEnumType(SHELL_VARIANTS, { name: 'ShellVariant' });

@ObjectType('PlatformAppearance')
export class PlatformAppearanceModel {
  @Field(() => SHELL_VARIANTS)
  activeShellVariant!: ShellVariant;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@Resolver(() => PlatformAppearanceModel)
export class AppearanceResolver {
  constructor(private readonly appearance: AppearanceService) {}

  @Query(() => PlatformAppearanceModel)
  platformAppearance(): Promise<AppearanceSettings> {
    return this.appearance.get();
  }

  @Query(() => PlatformAppearanceModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SystemSettingsUpdate)
  adminPlatformAppearance(): Promise<AppearanceSettings> {
    return this.appearance.get();
  }

  @Mutation(() => PlatformAppearanceModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SystemSettingsUpdate)
  updatePlatformAppearance(
    @AuthUser() user: AuthenticatedUser,
    @Args('activeShellVariant', { type: () => SHELL_VARIANTS }) variant: ShellVariant,
  ): Promise<AppearanceSettings> {
    return this.appearance.update(user.id, variant);
  }
}
