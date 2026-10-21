/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/profile-persistence.port.ts
 *
 * 🎯 Purpose:
 * Defines safe profile persistence operations without shared-row secrets or ORM contracts.
 *
 * 🧠 Responsibilities:
 * • retains independent lookup, directory and profile-only update semantics;
 * • exposes no role assignments, credentials or transaction callbacks.
 *
 * 🏗️ Architecture:
 * Consumer-owned semantic port; root infrastructure assembles owner-specific shared-row fragments.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PaginatedResult } from '@api/shared';
import type { ViewerProfile } from './viewer-profile.contract';
import type { ListUsersOptions } from '../domain/options/list-users.options';
import type { UpdateUserData } from '../domain/types/update-user-data.type';

export const USERS_PROFILE_PERSISTENCE = Symbol('USERS_PROFILE_PERSISTENCE');
export interface UsersProfilePersistence {
  findById(id: string): Promise<ViewerProfile | null>;
  findByEmail(email: string): Promise<ViewerProfile | null>;
  findByUsername(username: string): Promise<ViewerProfile | null>;
  findManyByIds(ids: string[]): Promise<ViewerProfile[]>;
  findPublicById(id: string): Promise<ViewerProfile | null>;
  findPublicByUsername(username: string): Promise<ViewerProfile | null>;
  findMany(options?: ListUsersOptions): Promise<PaginatedResult<ViewerProfile>>;
  updateById(id: string, data: UpdateUserData): Promise<ViewerProfile>;
}
