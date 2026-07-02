/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/mappers/list-users-query.mapper.ts
 *
 * 🎯 Purpose:
 * Maps Users HTTP query DTOs into domain-level listing options.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { ListUsersOptions } from '../../domain';
import type { ListUsersQueryDto } from '../dto/queries/list-users.query.dto';

export class ListUsersQueryMapper {
  static toOptions(query: ListUsersQueryDto): ListUsersOptions {
    return {
      pagination: {
        page: query.page,
        limit: query.limit,
      },
    };
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🧩 Presentation mappers translate HTTP input into application-safe shapes.
 * -----------------------------------------------------------------------------
 */
