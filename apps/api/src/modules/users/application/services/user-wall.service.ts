/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-wall.service.ts
 *
 * 🎯 Purpose:
 * Coordinates privacy-aware Profile Wall creation, reading and tombstones.
 *
 * 🧠 Responsibilities:
 * • validates text/image wall content;
 * • enforces profile privacy and block policy;
 * • permits deletion by the author or profile owner;
 * • keeps comments and reactions outside the Profile Wall boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  USER_WALL_REPOSITORY,
  type UserWallRepository,
} from '../../domain/repositories/user-wall.repository.interface';
import type { UserWallPost } from '../../domain/types/user-wall-post.type';
import { UserBlockService } from './user-block.service';
import { UserPrivacyService } from './user-privacy.service';
import { UsersService } from './users.service';

@Injectable()
export class UserWallService {
  constructor(
    @Inject(USER_WALL_REPOSITORY)
    private readonly wall: UserWallRepository,
    private readonly users: UsersService,
    private readonly privacy: UserPrivacyService,
    private readonly blocks: UserBlockService,
  ) {}

  async create(
    authorId: string,
    profileOwnerId: string,
    body?: string | null,
    imageMediaId?: string | null,
  ): Promise<UserWallPost> {
    const cleanBody = body?.trim() || null;
    const imageId = imageMediaId?.trim() || null;
    if (!cleanBody && !imageId) {
      throw new BadRequestException('A wall post requires text or an image.');
    }
    await this.assertCanAccess(authorId, profileOwnerId, true);
    if (imageId && !(await this.wall.isAttachableImage(imageId, authorId))) {
      throw new BadRequestException(
        'The wall image must be a READY image owned by the author.',
      );
    }
    return this.wall.create({
      profileOwnerId,
      authorId,
      body: cleanBody,
      imageMediaId: imageId,
    });
  }

  async list(viewerId: string, profileOwnerId: string, page = 1, limit = 20) {
    await this.assertCanAccess(viewerId, profileOwnerId, false);
    return this.wall.list(profileOwnerId, page, limit);
  }

  async remove(
    actorId: string,
    postId: string,
    reason?: string | null,
  ): Promise<UserWallPost> {
    const post = await this.wall.findById(postId);
    if (!post) throw new NotFoundException('Wall post not found.');
    if (post.authorId !== actorId && post.profileOwnerId !== actorId) {
      throw new ForbiddenException('You cannot remove this wall post.');
    }
    if (post.isDeleted) return post;
    return this.wall.tombstone(postId, actorId, reason?.trim() || null);
  }

  private async assertCanAccess(
    actorId: string,
    profileOwnerId: string,
    posting: boolean,
  ): Promise<void> {
    if (!(await this.users.exists(profileOwnerId))) {
      throw new NotFoundException('Profile owner not found.');
    }
    if (
      actorId !== profileOwnerId &&
      (await this.blocks.isBlocked(actorId, profileOwnerId))
    ) {
      throw new ForbiddenException('Profile Wall access is blocked.');
    }
    const visibility = await this.privacy.visibilityFor(
      profileOwnerId,
      actorId,
    );
    if (
      actorId !== profileOwnerId &&
      (visibility.profileVisibility === 'PRIVATE' ||
        (posting && !visibility.allowWallPosts))
    ) {
      throw new ForbiddenException('Profile Wall access is private.');
    }
  }
}

/**
 * The wall owns posts. Shared Comments and Reactions own the conversation.
 * Boundaries are less exciting than space lasers, but much safer.
 */
