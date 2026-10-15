/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-viewer-profile.reader.ts
 *
 * 🎯 Purpose:
 * Keeps the viewer allowlist over a single composed profile lookup.
 *
 * 🧠 Responsibilities:
 * • delegates to the safe shared-row assembly, without an independent Auth/profile reread;
 * • copies only the sixteen established presentation fields.
 *
 * 🏗️ Architecture:
 * Owned presentation projection adapter; root infrastructure owns the shared-row assembly, not authentication decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  USERS_PROFILE_PERSISTENCE,
  type UsersProfilePersistence,
} from '../../contracts/profile-persistence.port';
import type {
  ViewerProfileReader,
  ViewerProfile,
} from '../../contracts/viewer-profile.contract';
import { UserMapper } from '../../domain/mappers/user.mapper';

@Injectable()
export class PrismaViewerProfileReader implements ViewerProfileReader {
  constructor(
    @Inject(USERS_PROFILE_PERSISTENCE)
    private readonly profiles: UsersProfilePersistence,
  ) {}
  async findById(subjectId: string): Promise<ViewerProfile | null> {
    const profile = await this.profiles.findById(subjectId);
    return profile ? UserMapper.toSafeUser(profile) : null;
  }
}
