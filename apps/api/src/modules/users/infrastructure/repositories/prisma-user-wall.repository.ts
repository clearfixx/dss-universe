/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-wall.repository.ts
 *
 * 🎯 Purpose:
 * Persists Profile Wall posts, Media references, tombstones and audit records.
 *
 * 🧠 Responsibilities:
 * • validates attachable READY image ownership;
 * • creates posts and active Media references atomically;
 * • returns stable paginated wall history;
 * • tombstones posts without destroying public-content history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { MediaKind, MediaStatus } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type { PaginatedResult } from '@api/shared';

import type { UserWallRepository } from '../../domain/repositories/user-wall.repository.interface';
import type {
  CreateUserWallPost,
  UserWallPost,
} from '../../domain/types/user-wall-post.type';

const MEDIA_TARGET_TYPE = 'UserWallPost';
const MEDIA_PURPOSE = 'wall-image';
const WALL_POST_CREATED_EVENT = 'users.profile-wall.post-created.v1';
const WALL_POST_RETRACTED_EVENT = 'users.profile-wall.post-retracted.v1';

@Injectable()
export class PrismaUserWallRepository implements UserWallRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async create(input: CreateUserWallPost): Promise<UserWallPost> {
    return this.prisma.$transaction(async (transaction) => {
      const post = await transaction.userWallPost.create({ data: input });
      if (input.imageMediaId) {
        await transaction.mediaReference.create({
          data: {
            mediaId: input.imageMediaId,
            targetType: MEDIA_TARGET_TYPE,
            targetId: post.id,
            purpose: MEDIA_PURPOSE,
            createdBy: input.authorId,
          },
        });
      }
      await this.audit.append(transaction, {
        action: 'user.wall.post_created',
        actorType: 'USER',
        actorId: input.authorId,
        targetType: MEDIA_TARGET_TYPE,
        targetId: post.id,
        metadata: { profileOwnerId: input.profileOwnerId },
      });
      await this.outbox.append(
        transaction,
        createEventEnvelope({
          name: WALL_POST_CREATED_EVENT,
          version: 1,
          category: 'integration',
          producer: 'dss.api.users',
          actorId: input.authorId,
          aggregate: { type: MEDIA_TARGET_TYPE, id: post.id },
          payload: {
            profileOwnerId: input.profileOwnerId,
            hasImage: input.imageMediaId !== null,
          },
        }),
      );
      return this.toDomain(post);
    });
  }

  async findById(id: string): Promise<UserWallPost | null> {
    const post = await this.prisma.userWallPost.findUnique({ where: { id } });
    return post ? this.toDomain(post) : null;
  }

  async list(
    profileOwnerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserWallPost>> {
    const where = { profileOwnerId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.userWallPost.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.userWallPost.count({ where }),
    ]);
    return {
      items: items.map((post) => this.toDomain(post)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async isAttachableImage(mediaId: string, ownerId: string): Promise<boolean> {
    const count = await this.prisma.media.count({
      where: {
        id: mediaId,
        ownerId,
        kind: MediaKind.IMAGE,
        status: MediaStatus.READY,
        deletedAt: null,
      },
    });
    return count === 1;
  }

  async tombstone(
    postId: string,
    deletedById: string,
    reason: string | null,
  ): Promise<UserWallPost> {
    return this.prisma.$transaction(async (transaction) => {
      const post = await transaction.userWallPost.update({
        where: { id: postId },
        data: {
          deletedAt: new Date(),
          deletedById,
          deleteReason: reason,
        },
      });
      await transaction.mediaReference.updateMany({
        where: {
          targetType: MEDIA_TARGET_TYPE,
          targetId: postId,
          purpose: MEDIA_PURPOSE,
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
      await this.audit.append(transaction, {
        action: 'user.wall.post_deleted',
        actorType: 'USER',
        actorId: deletedById,
        targetType: MEDIA_TARGET_TYPE,
        targetId: postId,
        reason: reason ?? undefined,
        metadata: { profileOwnerId: post.profileOwnerId },
      });
      await this.outbox.append(
        transaction,
        createEventEnvelope({
          name: WALL_POST_RETRACTED_EVENT,
          version: 1,
          category: 'integration',
          producer: 'dss.api.users',
          actorId: deletedById,
          aggregate: { type: MEDIA_TARGET_TYPE, id: post.id },
          payload: { profileOwnerId: post.profileOwnerId },
        }),
      );
      return this.toDomain(post);
    });
  }

  private toDomain(post: {
    id: string;
    profileOwnerId: string;
    authorId: string;
    body: string | null;
    imageMediaId: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserWallPost {
    const isDeleted = post.deletedAt !== null;
    return {
      id: post.id,
      profileOwnerId: post.profileOwnerId,
      authorId: post.authorId,
      body: isDeleted ? null : post.body,
      imageMediaId: isDeleted ? null : post.imageMediaId,
      isDeleted,
      deletedAt: post.deletedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}

/**
 * 🧱 Wall rule: remove the reference when a post becomes a tombstone.
 * Orphan cleanup can handle the file; history keeps handling the truth.
 */
