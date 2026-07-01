import type { PaginatedResult } from '@api/shared';
import type {
  DatabasePaginationParams,
  DatabasePaginationQuery,
} from './pagination.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function getPagination(
  params: DatabasePaginationParams,
): DatabasePaginationQuery {
  const page = Math.max(Number(params.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(Number(params.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function createPaginatedResult<TItem>(params: {
  items: TItem[];
  page: number;
  limit: number;
  total: number;
}): PaginatedResult<TItem> {
  const { items, page, limit, total } = params;

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
