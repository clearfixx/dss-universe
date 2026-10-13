/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Asset Composition
 * 📄 File: apps/api/src/composition/profile-assets/application/profile-asset-presentation.service.ts
 *
 * 🎯 Purpose:
 * Coordinates validated Media commands and allowlisted Users presentation outside both features.
 *
 * 🧠 Responsibilities:
 * • invokes Media-owned validated commands before reading presentation;
 * • loads the allowlisted self-view from the published Users contract;
 * • rejects missing or mismatched presentation.
 *
 * 🏗️ Architecture:
 * Named multi-owner application composition, outside both feature applications.
 *
 * ⚠️ Important:
 * Do not add binary validation, profile policy or ORM access here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MEDIA_PROFILE_ASSET_COMMANDS,
  type MediaProfileAssetCommands,
} from '@api/modules/media';
import {
  VIEWER_PROFILE_READER,
  USER_ERRORS,
  type ViewerProfileReader,
} from '@api/modules/users';
@Injectable()
export class ProfileAssetPresentationService {
  constructor(
    @Inject(MEDIA_PROFILE_ASSET_COMMANDS)
    private readonly media: MediaProfileAssetCommands,
    @Inject(VIEWER_PROFILE_READER)
    private readonly profiles: ViewerProfileReader,
  ) {}
  async assignAvatar(subjectId: string, mediaId: string) {
    await this.media.assignAvatar(subjectId, mediaId);
    return this.viewer(subjectId);
  }
  async removeAvatar(subjectId: string) {
    await this.media.removeAvatar(subjectId);
    return this.viewer(subjectId);
  }
  async assignCover(subjectId: string, mediaId: string) {
    await this.media.assignCover(subjectId, mediaId);
    return this.viewer(subjectId);
  }
  async removeCover(subjectId: string) {
    await this.media.removeCover(subjectId);
    return this.viewer(subjectId);
  }
  private async viewer(subjectId: string) {
    const profile = await this.profiles.findById(subjectId);
    if (!profile || profile.id !== subjectId)
      throw new NotFoundException(USER_ERRORS.NOT_FOUND);
    return profile;
  }
}
