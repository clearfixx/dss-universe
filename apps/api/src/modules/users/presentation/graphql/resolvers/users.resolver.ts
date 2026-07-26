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
  Int,
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
import { UserPrivacyService } from '../../../application/services/user-privacy.service';
import {
  ProfileVisibilityInput,
  UpdateUserPrivacyInput,
} from '../inputs/update-user-privacy.input';
import { UserPrivacyModel } from '../models/user-privacy.model';
import type { UserPrivacySettings } from '../../../domain/types/user-privacy-settings.type';
import { UserSocialGraphService } from '../../../application/services/user-social-graph.service';
import { UserSocialGraphLoader } from '../loaders/user-social-graph.loader';
import { UserSocialGraphModel } from '../models/user-social-graph.model';
import { UserBlockService } from '../../../application/services/user-block.service';
import { UserBlockResultModel } from '../models/user-block-result.model';
import {
  MembersDirectoryInput,
  MembersDirectorySortInput,
} from '../inputs/members-directory.input';
import { MembersDirectoryPageModel } from '../models/members-directory-page.model';
import { UserStatus } from '@prisma/client';
import { UserPresenceService } from '../../../application/services/user-presence.service';
import { UserWallService } from '../../../application/services/user-wall.service';
import { CreateWallPostInput } from '../inputs/create-wall-post.input';
import { UserWallPostModel } from '../models/user-wall-post.model';
import { UserWallPageModel } from '../models/user-wall-page.model';
import type { UserWallPost } from '../../../domain/types/user-wall-post.type';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly userById: UserByIdLoader,
    private readonly socialLinksService: UserSocialLinksService,
    private readonly socialLinks: UserSocialLinksLoader,
    private readonly privacy: UserPrivacyService,
    private readonly graph: UserSocialGraphService,
    private readonly graphLoader: UserSocialGraphLoader,
    private readonly blocks: UserBlockService,
    private readonly presence: UserPresenceService,
    private readonly wall: UserWallService,
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

  @Query(() => UserPrivacyModel)
  @UseGuards(JwtAuthGuard)
  async viewerPrivacySettings(
    @AuthUser() authenticated: AuthenticatedUser,
  ): Promise<UserPrivacyModel> {
    return this.toPrivacyModel(await this.privacy.get(authenticated.id));
  }

  @Mutation(() => UserPrivacyModel)
  @UseGuards(JwtAuthGuard)
  async updateViewerPrivacy(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('input') input: UpdateUserPrivacyInput,
  ): Promise<UserPrivacyModel> {
    return this.toPrivacyModel(
      await this.privacy.update(authenticated.id, input),
    );
  }

  @ResolveField('socialLinks', () => [UserSocialLinkModel])
  socialLinksForUser(
    @Parent() user: UserModel,
    @AuthUser() authenticated: AuthenticatedUser,
  ): Promise<UserSocialLinkModel[]> {
    return this.visibleSocialLinks(user.id, authenticated.id);
  }

  @ResolveField('followerCount', () => Int)
  async followerCount(@Parent() user: UserModel): Promise<number> {
    return (await this.graphLoader.load(user.id)).followerCount;
  }

  @ResolveField('followingCount', () => Int)
  async followingCount(@Parent() user: UserModel): Promise<number> {
    return (await this.graphLoader.load(user.id)).followingCount;
  }

  @ResolveField('isOnline', () => Boolean)
  async isOnline(
    @Parent() user: UserModel,
    @AuthUser() authenticated: AuthenticatedUser,
  ): Promise<boolean> {
    return (
      (await this.presence.visibleStatuses([user.id], authenticated.id)).get(
        user.id,
      ) ?? false
    );
  }

  @Mutation(() => UserSocialGraphModel)
  @UseGuards(JwtAuthGuard)
  followUser(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<UserSocialGraphModel> {
    return this.graph.follow(authenticated.id, userId);
  }

  @Mutation(() => UserSocialGraphModel)
  @UseGuards(JwtAuthGuard)
  unfollowUser(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<UserSocialGraphModel> {
    return this.graph.unfollow(authenticated.id, userId);
  }

  @Mutation(() => UserBlockResultModel)
  @UseGuards(JwtAuthGuard)
  async blockUser(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<UserBlockResultModel> {
    await this.blocks.block(authenticated.id, userId);
    return { userId, blocked: true };
  }

  @Mutation(() => UserBlockResultModel)
  @UseGuards(JwtAuthGuard)
  async unblockUser(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<UserBlockResultModel> {
    await this.blocks.unblock(authenticated.id, userId);
    return { userId, blocked: false };
  }

  @Query(() => UsersPageModel)
  @UseGuards(JwtAuthGuard)
  async blockedUsers(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('pagination', { nullable: true }) pagination?: UsersPageInput,
  ): Promise<UsersPageModel> {
    const result = await this.blocks.list(
      authenticated.id,
      pagination?.page,
      pagination?.limit,
    );
    return this.toUsersPage(result);
  }

  @Query(() => UsersPageModel)
  @UseGuards(JwtAuthGuard)
  async followers(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true }) pagination?: UsersPageInput,
  ): Promise<UsersPageModel> {
    const result = await this.graph.followers(
      userId,
      authenticated.id,
      pagination?.page,
      pagination?.limit,
    );
    return this.toUsersPage(result);
  }

  @Query(() => UsersPageModel)
  @UseGuards(JwtAuthGuard)
  async following(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true }) pagination?: UsersPageInput,
  ): Promise<UsersPageModel> {
    const result = await this.graph.following(
      userId,
      authenticated.id,
      pagination?.page,
      pagination?.limit,
    );
    return this.toUsersPage(result);
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
  async userByUsername(
    @Args('username') username: string,
    @AuthUser() authenticated: AuthenticatedUser,
  ) {
    const user = await this.usersService.getPublicByUsername(
      username,
      authenticated.id,
    );

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

  @Query(() => MembersDirectoryPageModel)
  @UseGuards(JwtAuthGuard)
  async members(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('input', { nullable: true }) input?: MembersDirectoryInput,
  ): Promise<MembersDirectoryPageModel> {
    const onlineUserIds = input?.onlineOnly
      ? await this.presence.visibleOnlineUserIds(authenticated.id)
      : undefined;
    const result = await this.usersService.list({
      pagination: input,
      search: input?.search,
      sort: input?.sort ?? MembersDirectorySortInput.NEWEST,
      status: UserStatus.ACTIVE,
      role: input?.role?.trim() || undefined,
      userIds: onlineUserIds,
    });
    const userIds = result.items.map((user) => user.id);
    const [presence, roles] = await Promise.all([
      this.presence.visibleStatuses(userIds, authenticated.id),
      this.usersService.roleNamesByUserIds(userIds),
    ]);

    return {
      ...result,
      items: result.items.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isOnline: presence.get(user.id) ?? false,
        roles: roles.get(user.id) ?? [],
        createdAt: user.createdAt,
      })),
    };
  }

  @Mutation(() => UserWallPostModel)
  @UseGuards(JwtAuthGuard)
  async createProfileWallPost(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('input') input: CreateWallPostInput,
  ): Promise<UserWallPostModel> {
    return this.toWallPost(
      await this.wall.create(
        authenticated.id,
        input.profileOwnerId,
        input.body,
        input.imageMediaId,
      ),
    );
  }

  @Query(() => UserWallPageModel)
  @UseGuards(JwtAuthGuard)
  async profileWall(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('profileOwnerId', { type: () => ID }) profileOwnerId: string,
    @Args('pagination', { nullable: true }) pagination?: UsersPageInput,
  ): Promise<UserWallPageModel> {
    const result = await this.wall.list(
      authenticated.id,
      profileOwnerId,
      pagination?.page,
      pagination?.limit,
    );
    return {
      ...result,
      items: result.items.map((post) => this.toWallPost(post)),
    };
  }

  @Mutation(() => UserWallPostModel)
  @UseGuards(JwtAuthGuard)
  async removeProfileWallPost(
    @AuthUser() authenticated: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<UserWallPostModel> {
    return this.toWallPost(
      await this.wall.remove(authenticated.id, postId, reason),
    );
  }

  private async visibleSocialLinks(
    userId: string,
    viewerId: string,
  ): Promise<UserSocialLinkModel[]> {
    const visibility = await this.privacy.visibilityFor(userId, viewerId);
    return visibility.showSocialLinks ? this.socialLinks.load(userId) : [];
  }

  private toPrivacyModel(settings: UserPrivacySettings): UserPrivacyModel {
    return {
      ...settings,
      profileVisibility: settings.profileVisibility as ProfileVisibilityInput,
    };
  }

  private toUsersPage(
    result: Awaited<ReturnType<UserSocialGraphService['followers']>>,
  ): UsersPageModel {
    return {
      ...result,
      items: result.items.map((user) => UserGraphqlMapper.fromResponse(user)),
    };
  }

  private toWallPost(post: UserWallPost): UserWallPostModel {
    return {
      ...post,
      deletedAt: post.deletedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
