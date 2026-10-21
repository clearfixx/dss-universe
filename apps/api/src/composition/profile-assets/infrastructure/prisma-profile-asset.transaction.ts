/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Asset Composition
 * 📄 File: apps/api/src/composition/profile-assets/infrastructure/prisma-profile-asset.transaction.ts
 *
 * 🎯 Purpose:
 * Commits Media references, Users profile fields and audit as one explicit unit of work.
 *
 * 🧠 Responsibilities:
 * • obtains the owned Media write guard inside the current transaction;
 * • coordinates reference retirement and profile field writes atomically;
 * • commits attributable audit beside the mutation.
 *
 * 🏗️ Architecture:
 * Explicit cross-owner infrastructure unit of work, analogous to registration composition.
 *
 * ⚠️ Important:
 * Only closed avatar/cover slots are supported. No application port exposes Prisma.
 * The physical guard write coordinates cleanup without changing Media metadata.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { guardReadyPublicProfileMediaForAssignment } from '@api/modules/media/infrastructure';
import type {
  ProfileAssetTransaction,
  ProfileAssetAssignment,
  ProfileAssetSlot,
} from '@api/modules/media';
@Injectable()
export class PrismaProfileAssetTransaction implements ProfileAssetTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}
  private purpose(slot: ProfileAssetSlot): 'avatar' | 'cover' {
    if (slot === 'AVATAR') return 'avatar';
    if (slot === 'COVER') return 'cover';
    throw new BadRequestException('Unknown profile asset slot.');
  }
  async assign(input: ProfileAssetAssignment): Promise<void> {
    const purpose = this.purpose(input.slot);
    await this.prisma.$transaction(async (tx) => {
      const eligible = await guardReadyPublicProfileMediaForAssignment(
        tx,
        input.mediaId,
        input.subjectId,
      );
      if (!eligible) {
        throw new ConflictException(
          `${purpose === 'avatar' ? 'Avatar' : 'Cover'} media changed before it could be assigned.`,
        );
      }
      await tx.mediaReference.updateMany({
        where: {
          targetType: 'User',
          targetId: input.subjectId,
          purpose,
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
      await tx.mediaReference.create({
        data: {
          mediaId: input.mediaId,
          targetType: 'User',
          targetId: input.subjectId,
          purpose,
          createdBy: input.actorId,
        },
      });
      await tx.user.update({
        where: { id: input.subjectId },
        data:
          input.slot === 'AVATAR'
            ? { avatarMediaId: input.mediaId, avatarUrl: input.url }
            : { coverMediaId: input.mediaId, coverUrl: input.url },
      });
      await this.audit.append(tx, {
        action: `user.${purpose}.assigned`,
        actorType: 'USER',
        actorId: input.actorId,
        targetType: 'User',
        targetId: input.subjectId,
        metadata: { mediaId: input.mediaId },
      });
    });
  }
  async remove(
    slot: ProfileAssetSlot,
    subjectId: string,
    actorId: string,
  ): Promise<void> {
    const purpose = this.purpose(slot);
    await this.prisma.$transaction(async (tx) => {
      await tx.mediaReference.updateMany({
        where: {
          targetType: 'User',
          targetId: subjectId,
          purpose,
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
      await tx.user.update({
        where: { id: subjectId },
        data:
          slot === 'AVATAR'
            ? { avatarMediaId: null, avatarUrl: null }
            : { coverMediaId: null, coverUrl: null },
      });
      await this.audit.append(tx, {
        action: `user.${purpose}.removed`,
        actorType: 'USER',
        actorId,
        targetType: 'User',
        targetId: subjectId,
      });
    });
  }
}
