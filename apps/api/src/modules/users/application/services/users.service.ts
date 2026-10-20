/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/users.service.ts
 *
 * 🎯 Purpose:
 * Coordinates user-related business operations and exposes safe user APIs
 * for public and internal application use.
 *
 * 🧠 Responsibilities:
 * • reads users through the repository abstraction;
 * • exposes public user data through response DTOs;
 * • applies viewer privacy to individual and batched public projections;
 * • updates profile, avatar, cover and last-seen display state only;
 * • requests role names through a display-only input port;
 * • throws domain-level exceptions when users are not found.
 *
 * 🏗️ Architecture:
 * Application service. Owns user use cases. Does not know about HTTP
 * and does not access Prisma directly.
 *
 * ⚠️ Important:
 * Users receives no credential records and performs no Auth credential/status commands.
 *
 * 💡 Notes:
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers, something is wrong.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  PROFILE_ROLE_NAMES_READER,
  type ProfileRoleNamesReader,
} from '../../contracts/profile-role-names.port';

import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { UserMapper } from '../../domain/mappers/user.mapper';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository.interface';
import type { SafeUser } from '../../domain/types/safe-user.type';
import type { UserRecord } from '../../domain/types/user-record.type';
import type { UserPrivacySettings } from '../../domain/types/user-privacy-settings.type';
import type { UpdateUserProfileData } from '../types/update-user-profile-data.type';
import type { UserResponseDto } from '../dto';
import { UserResponseMapper } from '../mappers';
import type { PaginatedResult } from '@api/shared';
import type { ListUsersOptions } from '../../domain';
import { UserPrivacyService } from './user-privacy.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly privacy: UserPrivacyService,
    @Inject(PROFILE_ROLE_NAMES_READER)
    private readonly roleNames: ProfileRoleNamesReader,
  ) {}

  async list(
    options?: ListUsersOptions,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.usersRepository.findMany(options);

    return {
      ...result,
      items: result.items.map((user) => this.toResponseDto(user)),
    };
  }

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);

    return this.toResponseDto(this.requireUser(user));
  }

  async getByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByEmail(email);

    return this.toResponseDto(this.requireUser(user));
  }

  async getByUsername(username: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByUsername(username);

    return this.toResponseDto(this.requireUser(user));
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.usersRepository.findById(id);

    return Boolean(user);
  }

  async markLastSeen(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateById(id, {
      lastSeenAt: new Date(),
    });

    return this.toResponseDto(user);
  }

  async updateProfile(
    id: string,
    profile: UpdateUserProfileData,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateById(id, {
      displayName: this.cleanOptionalText(profile.displayName),
      bio: this.cleanOptionalText(profile.bio),
      location: this.cleanOptionalText(profile.location),
      website: this.cleanOptionalText(profile.website),
      technologies: this.cleanTags(profile.technologies),
      interests: this.cleanTags(profile.interests),
    });

    return this.toResponseDto(user);
  }

  async changeAvatar(
    id: string,
    avatarUrl: string | null,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateById(id, {
      avatarUrl,
    });

    return this.toResponseDto(user);
  }

  async changeCover(
    id: string,
    coverUrl: string | null,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateById(id, {
      coverUrl,
    });

    return this.toResponseDto(user);
  }

  async getPublicManyByIds(
    ids: string[],
    viewerId: string,
  ): Promise<UserResponseDto[]> {
    if (ids.length === 0) return [];
    const users = await this.usersRepository.findManyByIds(ids);
    const visibility = await this.privacy.visibilityForMany(
      users.map(({ id }) => id),
      viewerId,
    );
    return users.map((user) => {
      const policy = visibility.get(user.id);
      if (!policy) throw new Error('Profile privacy evidence is incomplete.');
      return this.projectPublicProfile(
        this.toResponseDto(user),
        policy,
        viewerId,
      );
    });
  }

  roleNamesByUserIds(
    userIds: string[],
  ): Promise<ReadonlyMap<string, readonly string[]>> {
    return this.roleNames.readNames(userIds);
  }

  async getPublicByUsername(
    username: string,
    viewerId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findPublicByUsername(username);
    return this.toPublicProfile(user, viewerId);
  }

  async getPublicById(id: string, viewerId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findPublicById(id);
    return this.toPublicProfile(user, viewerId);
  }

  private async toPublicProfile(
    user: UserRecord | null,
    viewerId?: string,
  ): Promise<UserResponseDto> {
    const response = this.toResponseDto(this.requireUser(user));
    const visibility = await this.privacy.visibilityFor(response.id, viewerId);
    return this.projectPublicProfile(response, visibility, viewerId);
  }

  private projectPublicProfile(
    response: UserResponseDto,
    visibility: UserPrivacySettings,
    viewerId?: string,
  ): UserResponseDto {
    const extendedProfileVisible =
      response.id === viewerId ||
      (visibility.profileVisibility === 'PUBLIC' && !viewerId) ||
      (visibility.profileVisibility !== 'PRIVATE' && Boolean(viewerId));
    return {
      ...response,
      bio: extendedProfileVisible ? response.bio : null,
      location: visibility.showLocation ? response.location : null,
      website: visibility.showWebsite ? response.website : null,
      technologies: extendedProfileVisible ? response.technologies : [],
      interests: extendedProfileVisible ? response.interests : [],
      lastSeenAt: visibility.showLastSeen ? response.lastSeenAt : null,
    };
  }

  private requireUser(user: UserRecord | null): UserRecord {
    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  private toSafeUser(user: UserRecord): SafeUser {
    return UserMapper.toSafeUser(user);
  }

  private toResponseDto(user: UserRecord): UserResponseDto {
    return UserResponseMapper.toDto(this.toSafeUser(user));
  }

  private cleanOptionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined || value === null) return value;
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private cleanTags(values: string[] | undefined): string[] | undefined {
    if (!values) return undefined;
    const unique = new Map<string, string>();
    for (const value of values) {
      const cleaned = value.trim();
      if (cleaned.length > 0) {
        unique.set(cleaned.toLocaleLowerCase('en-US'), cleaned);
      }
    }
    return [...unique.values()];
  }
}

/**
 * 🛰️ UsersService is the airlock between user data and the rest of DSS.
 * Raw records stay inside. Public DTOs may leave the station.
 */
