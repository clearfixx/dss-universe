/**
 * 📄 File: apps/api/src/shared/types/pagination-options.type.ts
 *
 * Shared pagination contract for query repositories.
 *
 * This type is intentionally small and boring.
 * Boring contracts age better than clever ones. 🛰️
 */

export type PaginationOptions = {
  page?: number;
  limit?: number;
};
