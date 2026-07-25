/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-access.service.ts
 *
 * 🎯 Purpose:
 * Applies visibility rules and issues short-lived media delivery URLs.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Permission } from '@api/core/authorization';
import type { AuthenticatedUser } from '@api/core/auth';

import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import { MediaAccessForbiddenException } from '../../domain/exceptions/media-access-forbidden.exception';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';
import type { IssuedMediaAccess } from '../types/media-access-token.type';
import { MediaUrlSignerService } from './media-url-signer.service';

@Injectable()
export class MediaAccessService {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
    private readonly signer: MediaUrlSignerService,
  ) {}

  async issue(
    user: AuthenticatedUser,
    mediaId: string,
    variantName: string,
    now = new Date(),
  ): Promise<IssuedMediaAccess> {
    const candidate = await this.media.findDeliveryCandidate(
      mediaId,
      variantName,
    );
    if (!candidate || candidate.status !== MediaStatus.READY) {
      throw new NotFoundException('Media variant not found.');
    }
    if (!this.canAccess(user, candidate.ownerId, candidate.visibility)) {
      throw new MediaAccessForbiddenException();
    }

    const issued = this.signer.issue(mediaId, variantName, user.id, now);
    return {
      url: `/api/media/signed/${issued.token}`,
      expiresAt: new Date(issued.payload.expiresAt * 1000),
    };
  }

  private canAccess(
    user: AuthenticatedUser,
    ownerId: string | null,
    visibility: MediaVisibility,
  ): boolean {
    if (
      visibility === MediaVisibility.PUBLIC ||
      visibility === MediaVisibility.AUTHENTICATED
    ) {
      return true;
    }
    if (ownerId === user.id) {
      return true;
    }
    return (
      visibility === MediaVisibility.RESTRICTED &&
      user.permissions.includes(Permission.MediaRestrictedRead)
    );
  }
}
