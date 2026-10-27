/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/presentation/graphql/authentication.resolver.ts
 *
 * 🎯 Purpose:
 * Preserves combined GraphQL auth/profile mutations outside feature applications.
 *
 * 🧠 Responsibilities:
 * • delegates authentication and registration composition;
 * • projects the existing Users viewer and explicit token transport.
 * • maps known Auth rejections after awaiting the complete composition use case.
 *
 * 🏗️ Architecture:
 * Thin GraphQL composition resolver using published owner presentation contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import type { GraphqlContext } from '@api/core/graphql';
import {
  LoginInput,
  RefreshTokenInput,
  mapAuthFailure,
} from '@api/modules/auth/presentation';
import { presentViewerProfile } from '@api/modules/users/presentation';
import { AuthenticationPresentationService } from '../../application/authentication-presentation.service';
import { RegisterInput } from './inputs/register.input';
import { AuthPayloadModel } from './models/auth-payload.model';

@Resolver()
export class AuthenticationResolver {
  constructor(
    private readonly presentation: AuthenticationPresentationService,
  ) {}
  @Mutation(() => AuthPayloadModel)
  async register(
    @Args('input') input: RegisterInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthPayloadModel> {
    try {
      return this.payload(
        await this.presentation.register(input, this.client(context)),
      );
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }
  @Mutation(() => AuthPayloadModel)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthPayloadModel> {
    try {
      return this.payload(
        await this.presentation.login(input, this.client(context)),
      );
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }
  @Mutation(() => AuthPayloadModel)
  async refreshTokens(
    @Args('input') input: RefreshTokenInput,
  ): Promise<AuthPayloadModel> {
    return this.payload(await this.presentation.refresh(input));
  }
  @Mutation(() => AuthPayloadModel)
  async reactivateAccount(
    @Args('input') input: LoginInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthPayloadModel> {
    try {
      return this.payload(
        await this.presentation.reactivateAccount(input, this.client(context)),
      );
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }
  private payload(
    result: Awaited<ReturnType<AuthenticationPresentationService['login']>>,
  ): AuthPayloadModel {
    return { user: presentViewerProfile(result.user), tokens: result.tokens };
  }
  private client(context: GraphqlContext) {
    return {
      userAgent: context.req.get('user-agent'),
      ipAddress: context.req.ip,
    };
  }
}
