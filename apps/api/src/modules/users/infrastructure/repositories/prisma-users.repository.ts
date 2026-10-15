/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-users.repository.ts
 *
 * 🎯 Purpose:
 * Adapts safe profile persistence operations without foreign Auth/IAM SQL.
 *
 * 🧠 Responsibilities:
 * • delegates independent/public/directory reads and profile-only updates;
 * • returns no credentials and exposes no generic account mutation or hard-delete operation.
 *
 * 🏗️ Architecture:
 * Owned repository behind the domain contract; a semantic root port handles shared-row query assembly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  USERS_PROFILE_PERSISTENCE,
  type UsersProfilePersistence,
} from '../../contracts/profile-persistence.port';
import type { UsersRepository } from '../../domain/repositories/users.repository.interface';
import type { ListUsersOptions } from '../../domain/options/list-users.options';
import type { UpdateUserData } from '../../domain/types/update-user-data.type';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(
    @Inject(USERS_PROFILE_PERSISTENCE)
    private readonly profiles: UsersProfilePersistence,
  ) {}
  findById(id: string) {
    return this.profiles.findById(id);
  }
  findByEmail(email: string) {
    return this.profiles.findByEmail(email);
  }
  findByUsername(username: string) {
    return this.profiles.findByUsername(username);
  }
  findManyByIds(ids: string[]) {
    return this.profiles.findManyByIds(ids);
  }
  findPublicById(id: string) {
    return this.profiles.findPublicById(id);
  }
  findPublicByUsername(username: string) {
    return this.profiles.findPublicByUsername(username);
  }
  findMany(options?: ListUsersOptions) {
    return this.profiles.findMany(options);
  }
  updateById(id: string, data: UpdateUserData) {
    return this.profiles.updateById(id, data);
  }
}

/** The shared table is downstairs. Its master keys are not in this repository. 🗄️ */
