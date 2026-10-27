/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/resolvers/auth.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authentication application use cases through GraphQL mutations.
 * Maps private credential failures without changing application accounting.
 *
 * ⚠️ Important:
 * Only Auth-owned account/session operations belong here.
 * Profile-bearing authentication mutations belong to identity composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { AuthService } from '../../../application/services/auth.service';
import { mapAuthFailure } from '../../mappers/map-auth-failure';
import { LogoutResultModel } from '../models/logout-result.model';
import { DeactivateAccountInput } from '../inputs/deactivate-account.input';
import { ChangeEmailInput } from '../inputs/change-email.input';
import { ChangePasswordInput } from '../inputs/change-password.input';
import { AuthSessionModel } from '../models/auth-session.model';
import { RevokeSessionsResultModel } from '../models/revoke-sessions-result.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  logout(@AuthUser() user: AuthenticatedUser): Promise<{ success: boolean }> {
    return this.authService.logout(user.id, user.sessionId);
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: DeactivateAccountInput,
  ): Promise<{ success: boolean }> {
    try {
      return await this.authService.deactivateAccount(user.id, input.password);
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  async changeViewerEmail(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: ChangeEmailInput,
  ): Promise<{ success: boolean }> {
    try {
      return await this.authService.changeEmail(
        user.id,
        input.email,
        input.currentPassword,
      );
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  async changeViewerPassword(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: ChangePasswordInput,
  ): Promise<{ success: boolean }> {
    try {
      return await this.authService.changePassword(
        user.id,
        input.currentPassword,
        input.newPassword,
      );
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
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
}
