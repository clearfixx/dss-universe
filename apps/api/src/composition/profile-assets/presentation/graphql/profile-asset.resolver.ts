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
    return presentViewerProfile(
      await this.presentation.assignAvatar(actor.id, mediaId),
    );
  }
  @Mutation(() => ViewerModel)
  async removeViewerAvatar(
    @AuthUser() actor: AuthenticatedUser,
  ): Promise<ViewerModel> {
    return presentViewerProfile(await this.presentation.removeAvatar(actor.id));
  }
  @Mutation(() => ViewerModel)
  async setViewerCover(
    @AuthUser() actor: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<ViewerModel> {
    return presentViewerProfile(
      await this.presentation.assignCover(actor.id, mediaId),
    );
  }
  @Mutation(() => ViewerModel)
  async removeViewerCover(
    @AuthUser() actor: AuthenticatedUser,
  ): Promise<ViewerModel> {
    return presentViewerProfile(await this.presentation.removeCover(actor.id));
  }
}
