/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Asset Presentation
 * 📄 File: apps/api/src/composition/profile-assets/presentation/graphql/profile-asset.resolver.ts
 *
 * 🎯 Purpose:
 * Preserves the four authenticated viewer mutations at the composition boundary.
 *
 * 🧠 Responsibilities:
 * • preserves existing mutation names, arguments and Viewer transport;
 * • derives the target subject from authenticated self context;
 * • delegates composition and uses the published Users presenter.
 * • maps known Media failures while preserving unknown rejection identities.
 *
 * 🏗️ Architecture:
 * Thin GraphQL composition resolver; no foreign service or mapper injection.
 *
 * ⚠️ Important:
 * All four routes require authentication. No arbitrary target-user input is accepted.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { mapMediaFailure } from '@api/modules/media/presentation';
import {
  ViewerModel,
  presentViewerProfile,
} from '@api/modules/users/presentation';
import { ProfileAssetPresentationService } from '../../application/profile-asset-presentation.service';
@Resolver()
@UseGuards(JwtAuthGuard)
export class ProfileAssetResolver {
  constructor(private readonly presentation: ProfileAssetPresentationService) {}
  @Mutation(() => ViewerModel)
  async setViewerAvatar(
    @AuthUser() actor: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<ViewerModel> {
    try {
      return presentViewerProfile(
        await this.presentation.assignAvatar(actor.id, mediaId),
      );
    } catch (failure) {
      throw mapMediaFailure(failure);
    }
  }
  @Mutation(() => ViewerModel)
  async removeViewerAvatar(
    @AuthUser() actor: AuthenticatedUser,
  ): Promise<ViewerModel> {
    try {
      return presentViewerProfile(
        await this.presentation.removeAvatar(actor.id),
      );
    } catch (failure) {
      throw mapMediaFailure(failure);
    }
  }
  @Mutation(() => ViewerModel)
  async setViewerCover(
    @AuthUser() actor: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<ViewerModel> {
    try {
      return presentViewerProfile(
        await this.presentation.assignCover(actor.id, mediaId),
      );
    } catch (failure) {
      throw mapMediaFailure(failure);
    }
  }
  @Mutation(() => ViewerModel)
  async removeViewerCover(
    @AuthUser() actor: AuthenticatedUser,
  ): Promise<ViewerModel> {
    try {
      return presentViewerProfile(
        await this.presentation.removeCover(actor.id),
      );
    } catch (failure) {
      throw mapMediaFailure(failure);
    }
  }
}
