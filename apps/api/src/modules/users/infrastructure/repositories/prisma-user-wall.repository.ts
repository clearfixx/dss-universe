/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-wall.repository.ts
 *
 * 🎯 Purpose:
 * Owns Profile Wall reads and redaction while composing writes through its semantic transaction port.
 *
 * 🧠 Responsibilities:
 * • reads/paginates posts and applies owned tombstone redaction;
 * • delegates atomic writes without sharing an ORM transaction.
 *
 * 🏗️ Architecture:
 * Users persistence adapter; legacy Media attachability reads remain separately visible.
 *
 * ⚠️ Important:
 * Retained deleted bodies/images must not escape the Users response projection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { MediaKind, MediaStatus } from '@prisma/client';

import { PrismaService } from '@api/core/database';
import type { PaginatedResult } from '@api/shared';
import {
  PROFILE_WALL_TRANSACTION,
  type ProfileWallTransaction,
} from '../../domain/ports/profile-wall-transaction.interface';

import type { UserWallRepository } from '../../domain/repositories/user-wall.repository.interface';
import type {
  CreateUserWallPost,
  UserWallPost,
} from '../../domain/types/user-wall-post.type';

@Injectable()
export class PrismaUserWallRepository implements UserWallRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROFILE_WALL_TRANSACTION)
    private readonly writes: ProfileWallTransaction,
  ) {}

  async create(input: CreateUserWallPost): Promise<UserWallPost> {
    return this.toDomain(await this.writes.create(input));
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
    return this.toDomain(
      await this.writes.tombstone(postId, deletedById, reason),
    );
  }

  private toDomain(post: {
    id: string;
    interactionTargetId: string;
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
      interactionTargetId: post.interactionTargetId,
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
