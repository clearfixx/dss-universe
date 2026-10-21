/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media-upload-session.repository.ts
 *
 * 🎯 Purpose:
 * Implements Media upload-session persistence through Prisma.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';

import type { MediaUploadStatus } from '../../domain/enums/media-upload-status.enum';
import type { MediaUploadSessionRepository } from '../../domain/repositories/media-upload-session.repository.interface';
import type { CreateMediaUploadSessionInput } from '../../domain/types/media-upload-session.type';
import type { MediaMetadata } from '../../domain/types/media-metadata.type';
import { PrismaMediaUploadSessionMapper } from '../mappers/prisma-media-upload-session.mapper';

@Injectable()
export class PrismaMediaUploadSessionRepository implements MediaUploadSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMediaUploadSessionInput) {
    const data: Prisma.MediaUploadSessionUncheckedCreateInput = {
      ...input,
      metadata: input.metadata ?? undefined,
    };
    const record = await this.prisma.mediaUploadSession.create({ data });
    return PrismaMediaUploadSessionMapper.toDomain(record);
  }

  async findById(id: string) {
    const record = await this.prisma.mediaUploadSession.findUnique({
      where: { id },
    });
    return record ? PrismaMediaUploadSessionMapper.toDomain(record) : null;
  }

  async updateStatus(
    id: string,
    status: MediaUploadStatus,
    completedAt: Date | null = null,
    metadata: MediaMetadata | null = null,
  ) {
    const record = await this.prisma.mediaUploadSession.update({
      where: { id },
      data: { status, completedAt, metadata: metadata ?? undefined },
    });
    return PrismaMediaUploadSessionMapper.toDomain(record);
  }
}
