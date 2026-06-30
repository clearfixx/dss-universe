/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/contracts/queries/list-users.query.ts
 *
 * 🎯 Purpose:
 * Defines the query contract for listing users.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserListFilters } from '../filters/user-list.filters';
import type { PaginationContract } from '../pagination/pagination.contract';

export type ListUsersQuery = {
  pagination: PaginationContract;
  filters?: UserListFilters;
};
