import { UseGuards } from '@nestjs/common';
import { ShellVariant, type PlatformAppearanceSettings } from '@prisma/client';
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

registerEnumType(ShellVariant, { name: 'ShellVariant' });

@ObjectType('PlatformAppearance')
export class PlatformAppearanceModel {
  @Field(() => ShellVariant)
  activeShellVariant!: ShellVariant;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@Resolver(() => PlatformAppearanceModel)
export class AppearanceResolver {
  constructor(private readonly appearance: AppearanceService) {}

  @Query(() => PlatformAppearanceModel)
  platformAppearance(): Promise<PlatformAppearanceSettings> {
    return this.appearance.get();
  }

  @Mutation(() => PlatformAppearanceModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SystemSettingsUpdate)
  updatePlatformAppearance(
    @AuthUser() user: AuthenticatedUser,
    @Args('activeShellVariant', { type: () => ShellVariant }) variant: ShellVariant,
  ): Promise<PlatformAppearanceSettings> {
    return this.appearance.update(user.id, variant);
  }
}
