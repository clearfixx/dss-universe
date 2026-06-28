import {
  PaginatedResult,
  PaginationMeta,
  PaginationParams,
  PaginationQuery,
} from './pagination.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function getPagination(params: PaginationParams): PaginationQuery {
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

export function createPaginationMeta(params: {
  page: number;
  limit: number;
  total: number;
}): PaginationMeta {
  const { page, limit, total } = params;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function createPaginatedResult<T>(params: {
  data: T[];
  page: number;
  limit: number;
  total: number;
}): PaginatedResult<T> {
  const { data, page, limit, total } = params;

  return {
    data,
    meta: createPaginationMeta({
      page,
      limit,
      total,
    }),
  };
}
