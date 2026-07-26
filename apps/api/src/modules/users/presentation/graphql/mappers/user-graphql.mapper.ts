/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/mappers/user-graphql.mapper.ts
 *
 * 🎯 Purpose:
 * Maps application user contracts to public GraphQL models.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserResponseDto } from '../../../application/dto';
import type { SafeUser } from '../../../domain/types/safe-user.type';
import type { UserModel } from '../models/user.model';
import type { ViewerModel } from '../models/viewer.model';

export class UserGraphqlMapper {
  static fromResponse(user: UserResponseDto): UserModel {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      location: user.location,
      website: user.website,
      technologies: user.technologies,
      interests: user.interests,
      socialLinks: [],
      avatarUrl: user.avatarUrl ?? this.fallbackAvatarUrl(user.username),
      coverUrl: user.coverUrl,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
    };
  }

  static viewerFromResponse(user: UserResponseDto): ViewerModel {
    return {
      ...this.fromResponse(user),
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      updatedAt: user.updatedAt,
    };
  }

  static viewerFromSafeUser(user: SafeUser): ViewerModel {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      location: user.location,
      website: user.website,
      technologies: user.technologies,
      interests: user.interests,
      socialLinks: [],
      avatarUrl: user.avatarUrl ?? this.fallbackAvatarUrl(user.username),
      coverUrl: user.coverUrl,
      status: user.status,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private static fallbackAvatarUrl(username: string): string {
    return `/api/media/avatars/fallback/${encodeURIComponent(username)}.svg`;
  }
}
