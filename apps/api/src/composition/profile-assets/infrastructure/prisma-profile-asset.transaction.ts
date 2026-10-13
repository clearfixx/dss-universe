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
 * • rechecks current Media ownership/availability inside the transaction;
 * • coordinates reference retirement and profile field writes atomically;
 * • commits attributable audit beside the mutation.
 *
 * 🏗️ Architecture:
 * Explicit cross-owner infrastructure unit of work, analogous to registration composition.
 *
 * ⚠️ Important:
 * Only closed avatar/cover slots are supported. No application port exposes Prisma.
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
      const media = await tx.media.findUnique({
        where: { id: input.mediaId },
        select: { ownerId: true, status: true, visibility: true },
      });
      if (
        !media ||
        media.ownerId !== input.subjectId ||
        media.status !== 'READY' ||
        media.visibility !== 'PUBLIC'
      ) {
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
