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
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { UserGraphqlMapper } from '../../../../users/presentation/graphql/mappers/user-graphql.mapper';
import { AuthService } from '../../../application/services/auth.service';
import { LoginInput } from '../inputs/login.input';
import { RefreshTokenInput } from '../inputs/refresh-token.input';
import { RegisterInput } from '../inputs/register.input';
import { AuthPayloadModel } from '../models/auth-payload.model';
import { LogoutResultModel } from '../models/logout-result.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayloadModel)
  async register(
    @Args('input') input: RegisterInput,
  ): Promise<AuthPayloadModel> {
    const result = await this.authService.register(input);

    return {
      user: UserGraphqlMapper.viewerFromSafeUser(result.user),
      tokens: result.tokens,
    };
  }

  @Mutation(() => AuthPayloadModel)
  async login(@Args('input') input: LoginInput): Promise<AuthPayloadModel> {
    const result = await this.authService.login(input);

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
    return this.authService.logout(user.id);
  }
}
