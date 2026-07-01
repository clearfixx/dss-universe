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
 * Controller is a dispatcher, not a council of elders.
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

import type { ListUsersOptions } from '../../domain';
import type { UserResponseDto } from '../../application/dto';
import { UsersService } from '../../application/services/users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.UsersRead)
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const options: ListUsersOptions = {
      pagination: {
        page: this.toPositiveNumber(page, 1),
        limit: this.toPositiveNumber(limit, 20),
      },
    };

    return this.usersService.list(options);
  }

  private toPositiveNumber(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return fallback;
    }

    return parsed;
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🎯 Controllers dispatch requests.
 * They do not make business decisions.
 * -----------------------------------------------------------------------------
 */
