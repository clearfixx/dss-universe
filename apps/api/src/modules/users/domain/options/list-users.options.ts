/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/options/list-users.options.ts
 *
 * 🎯 Purpose:
 * Defines repository options for listing users.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginationOptions } from '@api/shared';
import type { ViewerProfile } from '../../contracts/viewer-profile.contract';

export type ListUsersSort =
  | 'NEWEST'
  | 'OLDEST'
  | 'USERNAME_ASC'
  | 'USERNAME_DESC'
  | 'LAST_ACTIVE';

export type ListUsersOptions = {
  pagination?: PaginationOptions;
  search?: string;
  status?: ViewerProfile['status'];
  sort?: ListUsersSort;
  userIds?: string[];
  role?: string;
};
