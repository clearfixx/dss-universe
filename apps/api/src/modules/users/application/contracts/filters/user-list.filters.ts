/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/contracts/filters/user-list.filters.ts
 *
 * 🎯 Purpose:
 * Defines optional filters for listing users.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserStatus } from '@prisma/client';

export type UserListFilters = {
  search?: string;
  status?: UserStatus;
};
