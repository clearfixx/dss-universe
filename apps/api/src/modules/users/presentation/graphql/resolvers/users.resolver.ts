/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/resolvers/users.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes the Users pilot through thin, permission-aware GraphQL queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { NotFoundException, UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { UsersService } from '../../../application/services/users.service';
import { UsersPageInput } from '../inputs/users-page.input';
import { UserByIdLoader } from '../loaders/user-by-id.loader';
import { UserGraphqlMapper } from '../mappers/user-graphql.mapper';
import { UserModel } from '../models/user.model';
import { UsersPageModel } from '../models/users-page.model';
import { ViewerModel } from '../models/viewer.model';
import { UpdateViewerProfileInput } from '../inputs/update-viewer-profile.input';
import { UpdateViewerSocialLinksInput } from '../inputs/update-viewer-social-links.input';
import { UserSocialLinksService } from '../../../application/services/user-social-links.service';
import { UserSocialLinksLoader } from '../loaders/user-social-links.loader';
import { UserSocialLinkModel } from '../models/user-social-link.model';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly userById: UserByIdLoader,
    private readonly socialLinksService: UserSocialLinksService,
    private readonly socialLinks: UserSocialLinksLoader,
  ) {}

  @Query(() => ViewerModel)
  @UseGuards(JwtAuthGuard)
  async viewer(@AuthUser() authenticated: AuthenticatedUser) {
    const user = await this.usersService.getById(authenticated.id);

    return UserGraphqlMapper.viewerFromResponse(user);
  }

  @Mutation(() => ViewerModel)
  @UseGuards(JwtAuthGuard)
  async updateViewerProfile(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('input') input: UpdateViewerProfileInput,
  ): Promise<ViewerModel> {
    const user = await this.usersService.updateProfile(authenticated.id, input);
    return UserGraphqlMapper.viewerFromResponse(user);
  }

  @Mutation(() => [UserSocialLinkModel])
  @UseGuards(JwtAuthGuard)
  updateViewerSocialLinks(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('input') input: UpdateViewerSocialLinksInput,
  ): Promise<UserSocialLinkModel[]> {
    return this.socialLinksService.replace(authenticated.id, input.links);
  }

  @ResolveField('socialLinks', () => [UserSocialLinkModel])
  socialLinksForUser(
    @Parent() user: UserModel,
  ): Promise<UserSocialLinkModel[]> {
    return this.socialLinks.load(user.id);
  }

  @Query(() => UserModel)
  @UseGuards(JwtAuthGuard)
  async user(@Args('id', { type: () => ID }) id: string) {
    const result = await this.userById.load(id);

    if (!result) {
      throw new NotFoundException('User not found.');
    }

    return UserGraphqlMapper.fromResponse(result);
  }

  @Query(() => UserModel)
  @UseGuards(JwtAuthGuard)
  async userByUsername(@Args('username') username: string) {
    const user = await this.usersService.getPublicByUsername(username);

    return UserGraphqlMapper.fromResponse(user);
  }

  @Query(() => UsersPageModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.UsersRead)
  async users(
    @Args('pagination', { nullable: true }) pagination?: UsersPageInput,
  ): Promise<UsersPageModel> {
    const result = await this.usersService.list({ pagination });

    return {
      ...result,
      items: result.items.map((user) => UserGraphqlMapper.fromResponse(user)),
    };
  }
}
