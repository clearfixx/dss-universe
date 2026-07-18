/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/loaders/user-by-id.loader.ts
 *
 * 🎯 Purpose:
 * Batches user reads within one GraphQL request to prevent N+1 queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

import type { UserResponseDto } from '../../../application/dto';
import { UsersService } from '../../../application/services/users.service';

@Injectable({ scope: Scope.REQUEST })
export class UserByIdLoader extends DataLoader<string, UserResponseDto | null> {
  constructor(usersService: UsersService) {
    super(async (ids) => {
      const users = await usersService.getManyByIds([...ids]);
      const byId = new Map(users.map((user) => [user.id, user]));

      return ids.map((id) => byId.get(id) ?? null);
    });
  }
}
