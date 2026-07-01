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

export type ListUsersOptions = {
  pagination?: PaginationOptions;
};
