/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/contracts/list-users.query.contract.ts
 *
 * 🎯 Purpose:
 * Defines the domain query contract for listing users through the repository boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserListFilters } from '../../application/contracts/filters/user-list.filters';
import type { PaginationContract } from '../../application/contracts/pagination/pagination.contract';

export type ListUsersQueryContract = {
  pagination: PaginationContract;
  filters?: UserListFilters;
};
