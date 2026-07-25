/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/resolvers/media.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated Media upload-session use cases through GraphQL.
 *
 * ⚠️ Important:
 * Binary transfer remains a REST responsibility in the processing package.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { MediaUploadSessionService } from '../../../application/services/media-upload-session.service';
import { InitiateMediaUploadInput } from '../inputs/initiate-media-upload.input';
import { MediaUploadSessionGraphqlMapper } from '../mappers/media-upload-session-graphql.mapper';
import { MediaUploadSessionModel } from '../models/media-upload-session.model';
import { AvatarService } from '../../../application/services/avatar.service';
import { UsersService } from '../../../../users/application/services/users.service';
import { UserGraphqlMapper } from '../../../../users/presentation/graphql/mappers/user-graphql.mapper';
import { ViewerModel } from '../../../../users/presentation/graphql/models/viewer.model';
import { MediaAccessService } from '../../../application/services/media-access.service';
import { MediaAccessModel } from '../models/media-access.model';
import { MediaQuarantineService } from '../../../application/services/media-quarantine.service';
import { MediaQuarantineModel } from '../models/media-quarantine.model';
import { MediaQuarantineGraphqlMapper } from '../mappers/media-quarantine-graphql.mapper';
import { MediaLibraryService } from '../../../application/services/media-library.service';
import { MediaLibraryInput } from '../inputs/media-library.input';
import {
  MediaLibraryConnectionModel,
  MediaLibraryItemModel,
  MediaLibraryMetricsModel,
} from '../models/media-library.model';
import { MediaLibraryGraphqlMapper } from '../mappers/media-library-graphql.mapper';
import { MediaJobService } from '../../../application/services/media-job.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class MediaResolver {
  constructor(
    private readonly sessions: MediaUploadSessionService,
    private readonly avatars: AvatarService,
    private readonly users: UsersService,
    private readonly access: MediaAccessService,
    private readonly quarantine: MediaQuarantineService,
    private readonly library: MediaLibraryService,
    private readonly jobs: MediaJobService,
  ) {}

  @Mutation(() => MediaUploadSessionModel)
  async initiateMediaUpload(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: InitiateMediaUploadInput,
  ): Promise<MediaUploadSessionModel> {
    const session = await this.sessions.initiate(user.id, input);
    return MediaUploadSessionGraphqlMapper.toModel(session);
  }

  @Query(() => MediaUploadSessionModel)
  async mediaUploadSession(
    @AuthUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ): Promise<MediaUploadSessionModel> {
    const session = await this.sessions.findOwned(user.id, id);
    return MediaUploadSessionGraphqlMapper.toModel(session);
  }

  @Mutation(() => MediaUploadSessionModel)
  async abortMediaUpload(
    @AuthUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ): Promise<MediaUploadSessionModel> {
    const session = await this.sessions.abort(user.id, id);
    return MediaUploadSessionGraphqlMapper.toModel(session);
  }

  @Mutation(() => ViewerModel)
  async setViewerAvatar(
    @AuthUser() user: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<ViewerModel> {
    await this.avatars.assign(user.id, mediaId);
    return UserGraphqlMapper.viewerFromResponse(
      await this.users.getById(user.id),
    );
  }

  @Mutation(() => ViewerModel)
  async removeViewerAvatar(
    @AuthUser() user: AuthenticatedUser,
  ): Promise<ViewerModel> {
    await this.avatars.remove(user.id);
    return UserGraphqlMapper.viewerFromResponse(
      await this.users.getById(user.id),
    );
  }

  @Query(() => MediaAccessModel)
  mediaAccessUrl(
    @AuthUser() user: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
    @Args('variantName') variantName: string,
  ): Promise<MediaAccessModel> {
    return this.access.issue(user, mediaId, variantName);
  }

  @Query(() => [MediaQuarantineModel])
  async quarantinedMedia(
    @AuthUser() user: AuthenticatedUser,
    @Args('limit', { type: () => Int, defaultValue: 25 }) limit: number,
  ): Promise<MediaQuarantineModel[]> {
    return (await this.quarantine.list(user, limit)).map((media) =>
      MediaQuarantineGraphqlMapper.toModel(media),
    );
  }

  @Mutation(() => MediaQuarantineModel)
  async rescanQuarantinedMedia(
    @AuthUser() user: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<MediaQuarantineModel> {
    return MediaQuarantineGraphqlMapper.toModel(
      await this.quarantine.requestRescan(user, mediaId),
    );
  }

  @Mutation(() => MediaQuarantineModel)
  async rejectQuarantinedMedia(
    @AuthUser() user: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<MediaQuarantineModel> {
    return MediaQuarantineGraphqlMapper.toModel(
      await this.quarantine.reject(user, mediaId),
    );
  }

  @Query(() => MediaLibraryConnectionModel)
  async mediaLibrary(
    @AuthUser() user: AuthenticatedUser,
    @Args('input', { nullable: true }) input?: MediaLibraryInput,
  ): Promise<MediaLibraryConnectionModel> {
    const result = await this.library.browse(user, input);
    return {
      items: result.items.map((media) =>
        MediaLibraryGraphqlMapper.toItem(media),
      ),
      pageInfo: {
        hasNextPage: result.hasNextPage,
        endCursor: result.endCursor,
      },
    };
  }

  @Query(() => MediaLibraryMetricsModel)
  mediaLibraryMetrics(
    @AuthUser() user: AuthenticatedUser,
  ): Promise<MediaLibraryMetricsModel> {
    return this.library.metrics(user);
  }

  @Mutation(() => MediaLibraryItemModel)
  async retryFailedMedia(
    @AuthUser() user: AuthenticatedUser,
    @Args('mediaId', { type: () => ID }) mediaId: string,
  ): Promise<MediaLibraryItemModel> {
    return MediaLibraryGraphqlMapper.toItem(
      await this.jobs.retryFailed(user, mediaId),
    );
  }
}
