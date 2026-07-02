/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/controllers/users.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for user-related operations.
 *
 * 🧠 Responsibilities:
 * • defines the Users HTTP route boundary;
 * • receives incoming user-related requests;
 * • delegates all business work to UsersService.
 *
 * 🏗️ Architecture:
 * Thin controller.
 * No business logic.
 *
 * ⚠️ Important:
 * Do not move user business rules into this controller.
 *
 * 💡 Notes:
 * Controllers dispatch requests.
 * They should never parse, validate, or transform HTTP data manually.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import type { PaginatedResult } from '@api/shared';

import type { UserResponseDto } from '../../application/dto';
import { UsersService } from '../../application/services/users.service';
import { ListUsersQueryDto } from '../dto/queries/list-users.query.dto';
import { ListUsersQueryMapper } from '../mappers/list-users-query.mapper';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.UsersRead)
  list(
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    return this.usersService.list(ListUsersQueryMapper.toOptions(query));
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🎯 Controllers dispatch requests.
 * They do not make business decisions.
 * -----------------------------------------------------------------------------
 */
