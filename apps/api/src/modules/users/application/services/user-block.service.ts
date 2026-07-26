/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-block.service.ts
 *
 * 🎯 Purpose:
 * Coordinates user blocks and exposes the central interaction safety policy.
 *
 * 🧠 Responsibilities:
 * • rejects self-block and missing targets;
 * • delegates atomic block and follow cleanup;
 * • exposes block enforcement to social features;
 * • returns the owner's bounded blocked-user list.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { PaginatedResult } from '@api/shared';

import {
  USER_BLOCK_REPOSITORY,
  type UserBlockRepository,
} from '../../domain/repositories/user-block.repository.interface';
import type { UserResponseDto } from '../dto';
import { UsersService } from './users.service';

@Injectable()
export class UserBlockService {
  constructor(
    @Inject(USER_BLOCK_REPOSITORY)
    private readonly blocks: UserBlockRepository,
    private readonly users: UsersService,
  ) {}

  async block(actorId: string, targetId: string): Promise<void> {
    this.assertDifferentUsers(actorId, targetId);
    if (!(await this.users.exists(targetId))) {
      throw new BadRequestException('The user to block does not exist.');
    }
    await this.blocks.block(actorId, targetId);
  }

  async unblock(actorId: string, targetId: string): Promise<void> {
    this.assertDifferentUsers(actorId, targetId);
    await this.blocks.unblock(actorId, targetId);
  }

  isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    return this.blocks.existsEitherDirection(userId, otherUserId);
  }

  async list(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.blocks.blockedUsers(userId, page, limit);
    const users = await this.users.getManyByIds(result.items);
    const byId = new Map(users.map((user) => [user.id, user]));
    return {
      ...result,
      items: result.items.flatMap((id) => {
        const user = byId.get(id);
        return user ? [user] : [];
      }),
    };
  }

  private assertDifferentUsers(actorId: string, targetId: string): void {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot block yourself.');
    }
  }
}
