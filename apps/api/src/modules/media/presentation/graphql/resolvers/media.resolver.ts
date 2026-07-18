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
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { MediaUploadSessionService } from '../../../application/services/media-upload-session.service';
import { InitiateMediaUploadInput } from '../inputs/initiate-media-upload.input';
import { MediaUploadSessionGraphqlMapper } from '../mappers/media-upload-session-graphql.mapper';
import { MediaUploadSessionModel } from '../models/media-upload-session.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class MediaResolver {
  constructor(private readonly sessions: MediaUploadSessionService) {}

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
}
