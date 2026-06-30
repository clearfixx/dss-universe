/**
 * 📄 File: apps/api/src/shared/index.ts
 *
 * Public shared API.
 *
 * Shared is intentionally boring and business-neutral.
 * If it knows about a feature module, we already did something cursed. 🛰️
 */

export type { PaginationOptions } from './domain/types/pagination-options.type';
export type { PaginatedResult } from './domain/types/paginated-result.type';

export type { BaseQueryRepository } from './domain/repositories/base-query.repository.interface';
export type { BaseMutationRepository } from './domain/repositories/base-mutation.repository.interface';
