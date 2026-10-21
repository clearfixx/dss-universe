/**
 * 📄 File: apps/api/src/shared/types/paginated-result.type.ts
 *
 * Shared paginated result shape.
 *
 * Every query repository that returns a list should eventually speak
 * this language, so our modules do not invent pagination again and again.
 */

export type PaginatedResult<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
