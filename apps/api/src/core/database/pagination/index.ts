/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Database Pagination
 * 📄 File: apps/api/src/core/database/pagination/index.ts
 *
 * 🎯 Purpose:
 * Exposes existing pagination helpers and types without changing their algorithms.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { getPagination, createPaginatedResult } from './pagination.helper';
export type {
  PaginationParams,
  PaginationMeta,
  PaginationQuery,
  PaginatedResult,
  DatabasePaginationParams,
  DatabasePaginationQuery,
} from './pagination.types';
