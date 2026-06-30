/**
 * 📄 File: apps/api/src/shared/repositories/base-query.repository.interface.ts
 *
 * Base query repository contract.
 *
 * Query repositories are read-only by design.
 * They may fetch, search, count, and inspect data,
 * but they must not mutate state.
 */

import type { PaginatedResult } from '../types/paginated-result.type';
import type { PaginationOptions } from '../types/pagination-options.type';

export interface BaseQueryRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;

  existsById(id: TId): Promise<boolean>;

  findMany(pagination?: PaginationOptions): Promise<PaginatedResult<TEntity>>;

  count(): Promise<number>;
}
