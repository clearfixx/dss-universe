/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-profile-persistence.shape.ts
 *
 * 🎯 Purpose:
 * Defines owned profile fields and directory/profile-write fragments for guarded shared-row assembly.
 *
 * 🧠 Responsibilities:
 * • selects only thirteen owned profile/identity/technical metadata fields;
 * • retains search, sorting, pagination and profile-only update behavior;
 * • never selects credentials, Auth display facts or IAM relations.
 *
 * 🏗️ Architecture:
 * Operation-specific pure infrastructure fragments; no database/client lifetime or foreign module imports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type {
  ListUsersOptions,
  ListUsersSort,
} from '../../domain/options/list-users.options';
import type { UpdateUserData } from '../../domain/types/update-user-data.type';

export const usersProfileSelect = Object.freeze({
  id: true,
  username: true,
  displayName: true,
  bio: true,
  location: true,
  website: true,
  technologies: true,
  interests: true,
  avatarUrl: true,
  coverUrl: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const);
export function profileById(id: string) {
  return { id };
}
export function profileByUsername(username: string) {
  return { username };
}
export function profilesByIds(ids: readonly string[]) {
  return { id: { in: [...ids] } };
}

function directoryOrder(
  sort: ListUsersSort | undefined,
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case 'OLDEST':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'USERNAME_ASC':
      return [{ username: 'asc' }, { id: 'asc' }];
    case 'USERNAME_DESC':
      return [{ username: 'desc' }, { id: 'asc' }];
    case 'LAST_ACTIVE':
      return [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}
export function profileDirectoryQuery(
  options: Pick<ListUsersOptions, 'pagination' | 'search' | 'sort' | 'userIds'>,
) {
  const page = options.pagination?.page ?? 1;
  const limit = options.pagination?.limit ?? 20;
  const search = options.search?.trim();
  const where: Prisma.UserWhereInput = {
    ...(options.userIds ? profilesByIds(options.userIds) : {}),
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    where,
    orderBy: directoryOrder(options.sort),
  };
}
export function profileUpdateData(
  data: UpdateUserData,
): Prisma.UserUpdateInput {
  return {
    username: data.username,
    displayName: data.displayName,
    bio: data.bio,
    location: data.location,
    website: data.website,
    technologies: data.technologies,
    interests: data.interests,
    avatarUrl: data.avatarUrl,
    coverUrl: data.coverUrl,
    lastSeenAt: data.lastSeenAt,
  };
}

/** A shared table is not a shared key ring. ☕ */
