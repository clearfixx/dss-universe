/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/resolvers/two-factor.resolver.ts
 *
 * 🎯 Purpose:
 * Presents owned two-factor operations and maps private proof failures.
 *
 * ⚠️ Important:
 * Proof verification and credential transactions remain in the application.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { TwoFactorService } from '../../../application/services/two-factor.service';
import { mapAuthFailure } from '../../mappers/map-auth-failure';
import { LogoutResultModel } from '../models/logout-result.model';
import { ConfirmTwoFactorInput } from '../inputs/confirm-two-factor.input';
import { DisableTwoFactorInput } from '../inputs/disable-two-factor.input';
import {
  TwoFactorStatusModel,
  TwoFactorSetupModel,
  TwoFactorConfirmationModel,
} from '../models/two-factor.model';

@Resolver()
export class TwoFactorResolver {
  constructor(private readonly twoFactor: TwoFactorService) {}

  @Query(() => TwoFactorStatusModel)
  @UseGuards(JwtAuthGuard)
  viewerTwoFactorStatus(@AuthUser() user: AuthenticatedUser) {
    return this.twoFactor.status(user.id);
  }

  @Mutation(() => TwoFactorSetupModel)
  @UseGuards(JwtAuthGuard)
  beginViewerTwoFactorSetup(@AuthUser() user: AuthenticatedUser) {
    return this.twoFactor.begin(user.id, user.email);
  }

  @Mutation(() => TwoFactorConfirmationModel)
  @UseGuards(JwtAuthGuard)
  confirmViewerTwoFactorSetup(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: ConfirmTwoFactorInput,
  ) {
    return this.twoFactor.confirm(user.id, input.code);
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  async disableViewerTwoFactor(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: DisableTwoFactorInput,
  ) {
    try {
      return await this.twoFactor.disable(user.id, input.password, input.code);
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }
}
