/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-viewer-profile.reader.ts
 *
 * 🎯 Purpose:
 * Loads the existing viewer presentation through an explicit field allowlist.
 *
 * 🧠 Responsibilities:
 * • selects only the sixteen supported viewer fields;
 * • maps storage values without exposing credentials or internal relations.
 *
 * 🏗️ Architecture:
 * Users-owned read adapter for presentation composition.
 *
 * ⚠️ Important:
 * This projection is not authoritative authentication or authorization state.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  ViewerProfileReader,
  ViewerProfile,
} from '../../contracts/viewer-profile.contract';
import { UserMapper } from '../../domain/mappers/user.mapper';

@Injectable()
export class PrismaViewerProfileReader implements ViewerProfileReader {
  constructor(private readonly prisma: PrismaService) {}
  async findById(subjectId: string): Promise<ViewerProfile | null> {
    const profile = await this.prisma.user.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        location: true,
        website: true,
        technologies: true,
        interests: true,
        avatarUrl: true,
        coverUrl: true,
        status: true,
        emailVerifiedAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return profile ? UserMapper.toSafeUser(profile) : null;
  }
}
