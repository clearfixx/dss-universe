/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Target Composition
 * 📄 File: apps/api/src/composition/content-targets/infrastructure/prisma-profile-wall.transaction.ts
 *
 * 🎯 Purpose:
 * Keeps Profile Wall lifecycle, targets, references, audit and outbox in one transaction.
 *
 * 🧠 Responsibilities:
 * • coordinates post creation or tombstone with target/reference lifecycle;
 * • commits all owner and target audit/outbox records atomically.
 *
 * 🏗️ Architecture:
 * Explicit root infrastructure unit of work; Users retains policy and response redaction.
 *
 * ⚠️ Important:
 * Semantic ports contain no ORM client; raw retained content is not a public response.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';
import {
  PROFILE_WALL_INTERACTION_KIND,
  type ProfileWallTransaction,
  type ProfileWallWriteResult,
  type CreateUserWallPost,
} from '@api/modules/users';

const MEDIA_TARGET_TYPE = 'UserWallPost';
const MEDIA_PURPOSE = 'wall-image';
const WALL_POST_CREATED_EVENT = 'users.profile-wall.post-created.v1';
const WALL_POST_RETRACTED_EVENT = 'users.profile-wall.post-retracted.v1';
@Injectable()
export class PrismaProfileWallTransaction implements ProfileWallTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    private readonly interactionTargets: PrismaInteractionTargetWriter,
  ) {}

  async create(input: CreateUserWallPost): Promise<ProfileWallWriteResult> {
    return this.prisma.$transaction(async (transaction) => {
      const postId = randomUUID();
      const interactionTargetId = randomUUID();
      await this.interactionTargets.register(transaction, {
        id: interactionTargetId,
        kind: PROFILE_WALL_INTERACTION_KIND,
        ownerModule: 'users',
        ownerType: MEDIA_TARGET_TYPE,
        ownerId: postId,
        actorId: input.authorId,
      });
      const post = await transaction.userWallPost.create({
        data: { ...input, id: postId, interactionTargetId },
      });
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
      return this.toWriteResult(post);
    });
  }

  async tombstone(
    postId: string,
    deletedById: string,
    reason: string | null,
  ): Promise<ProfileWallWriteResult> {
    return this.prisma.$transaction(async (transaction) => {
      const post = await transaction.userWallPost.update({
        where: { id: postId },
        data: {
          deletedAt: new Date(),
          deletedById,
          deleteReason: reason,
        },
      });
      await this.interactionTargets.setStatus(
        transaction,
        post.interactionTargetId,
        'LOCKED',
        deletedById,
        reason ?? 'Profile Wall post tombstoned.',
      );
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
      return this.toWriteResult(post);
    });
  }

  private toWriteResult(post: ProfileWallWriteResult): ProfileWallWriteResult {
    return {
      id: post.id,
      interactionTargetId: post.interactionTargetId,
      profileOwnerId: post.profileOwnerId,
      authorId: post.authorId,
      body: post.body,
      imageMediaId: post.imageMediaId,
      deletedAt: post.deletedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
