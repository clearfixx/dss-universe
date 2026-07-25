/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media.repository.ts
 *
 * 🎯 Purpose:
 * Implements Media persistence through Prisma.
 *
 * 🧠 Responsibilities:
 * • persists and loads Media domain records;
 * • scopes owner listings away from deleted records;
 * • exposes active-reference counts for safe deletion workflows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';

import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import type { CreateMediaInput } from '../../domain/types/create-media.input';
import type { UpdateMediaInput } from '../../domain/types/update-media.input';
import { PrismaMediaMapper } from '../mappers/prisma-media.mapper';

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMediaInput) {
    const data: Prisma.MediaUncheckedCreateInput = {
      ...input,
      metadata: input.metadata ?? undefined,
    };
    const record = await this.prisma.media.create({ data });
    return PrismaMediaMapper.toDomain(record);
  }

  async findById(id: string) {
    const record = await this.prisma.media.findUnique({ where: { id } });
    return record ? PrismaMediaMapper.toDomain(record) : null;
  }

  async findByOwnerId(ownerId: string) {
    const records = await this.prisma.media.findMany({
      where: { ownerId, status: { not: MediaStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => PrismaMediaMapper.toDomain(record));
  }

  async update(id: string, input: UpdateMediaInput) {
    const record = await this.prisma.media.update({
      where: { id },
      data: input,
    });
    return PrismaMediaMapper.toDomain(record);
  }

  async softDelete(id: string) {
    const deletedAt = new Date();
    const record = await this.prisma.media.update({
      where: { id },
      data: { status: MediaStatus.DELETED, deletedAt },
    });
    return PrismaMediaMapper.toDomain(record);
  }

  countActiveReferences(id: string): Promise<number> {
    return this.prisma.mediaReference.count({
      where: { mediaId: id, removedAt: null },
    });
  }

  async findPublicVariant(mediaId: string, variantName: string) {
    const variant = await this.prisma.mediaVariant.findFirst({
      where: {
        mediaId,
        name: variantName,
        media: {
          status: MediaStatus.READY,
          visibility: 'PUBLIC',
          deletedAt: null,
        },
      },
    });

    return variant
      ? {
          ...variant,
          storageProvider:
            variant.storageProvider as unknown as MediaStorageProvider,
          metadata: PrismaMediaMapper.toMetadata(variant.metadata),
        }
      : null;
  }
}
