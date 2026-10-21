/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/dto/queries/list-users.query.dto.ts
 *
 * 🎯 Purpose:
 * Defines the HTTP query contract for listing users.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit = 20;
}

/**
 * -----------------------------------------------------------------------------
 * 📨 Query DTOs keep HTTP parsing out of controllers.
 * -----------------------------------------------------------------------------
 */
