/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/resolvers/auth.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authentication application use cases through GraphQL mutations.
 *
 * ⚠️ Important:
 * This resolver does not redefine the refresh-session model planned for Phase 5.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import type { GraphqlContext } from '@api/core/graphql';

import { UserGraphqlMapper } from '../../../../users/presentation/graphql/mappers/user-graphql.mapper';
import { AuthService } from '../../../application/services/auth.service';
import { LoginInput } from '../inputs/login.input';
import { RefreshTokenInput } from '../inputs/refresh-token.input';
import { RegisterInput } from '../inputs/register.input';
import { AuthPayloadModel } from '../models/auth-payload.model';
import { LogoutResultModel } from '../models/logout-result.model';
import { DeactivateAccountInput } from '../inputs/deactivate-account.input';
import { ChangeEmailInput } from '../inputs/change-email.input';
import { ChangePasswordInput } from '../inputs/change-password.input';
import { AuthSessionModel } from '../models/auth-session.model';
import { RevokeSessionsResultModel } from '../models/revoke-sessions-result.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayloadModel)
  async register(
    @Args('input') input: RegisterInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthPayloadModel> {
    const result = await this.authService.register(input, this.client(context));

    return {
      user: UserGraphqlMapper.viewerFromSafeUser(result.user),
      tokens: result.tokens,
    };
  }

  @Mutation(() => AuthPayloadModel)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthPayloadModel> {
    const result = await this.authService.login(input, this.client(context));

    return {
      user: UserGraphqlMapper.viewerFromSafeUser(result.user),
      tokens: result.tokens,
    };
  }

  @Mutation(() => AuthPayloadModel)
  async refreshTokens(
    @Args('input') input: RefreshTokenInput,
  ): Promise<AuthPayloadModel> {
    const result = await this.authService.refresh(input);

    return {
      user: UserGraphqlMapper.viewerFromSafeUser(result.user),
      tokens: result.tokens,
    };
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  logout(@AuthUser() user: AuthenticatedUser): Promise<{ success: boolean }> {
    return this.authService.logout(user.id, user.sessionId);
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  deactivateAccount(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: DeactivateAccountInput,
  ): Promise<{ success: boolean }> {
    return this.authService.deactivateAccount(user.id, input.password);
  }

  @Mutation(() => AuthPayloadModel)
  async reactivateAccount(
    @Args('input') input: LoginInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthPayloadModel> {
    const result = await this.authService.reactivateAccount(
      input,
      this.client(context),
    );
    return {
      user: UserGraphqlMapper.viewerFromSafeUser(result.user),
      tokens: result.tokens,
    };
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  changeViewerEmail(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: ChangeEmailInput,
  ): Promise<{ success: boolean }> {
    return this.authService.changeEmail(
      user.id,
      input.email,
      input.currentPassword,
    );
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  changeViewerPassword(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: ChangePasswordInput,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(
      user.id,
      input.currentPassword,
      input.newPassword,
    );
  }

  @Query(() => [AuthSessionModel])
  @UseGuards(JwtAuthGuard)
  async viewerSessions(
    @AuthUser() user: AuthenticatedUser,
  ): Promise<AuthSessionModel[]> {
    return (await this.authService.listSessions(user.id)).map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      current: session.id === user.sessionId,
    }));
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  revokeViewerSession(
    @AuthUser() user: AuthenticatedUser,
    @Args('sessionId', { type: () => ID }) sessionId: string,
  ): Promise<{ success: boolean }> {
    return this.authService.revokeSession(user.id, sessionId);
  }

  @Mutation(() => RevokeSessionsResultModel)
  @UseGuards(JwtAuthGuard)
  revokeOtherViewerSessions(
    @AuthUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; revokedCount: number }> {
    return this.authService.revokeOtherSessions(user.id, user.sessionId);
  }

  private client(context: GraphqlContext) {
    return {
      userAgent: context.req.get('user-agent'),
      ipAddress: context.req.ip,
    };
  }
}
