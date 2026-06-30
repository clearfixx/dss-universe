/**
 * -----------------------------------------------------------------------------
 * 📄 File: apps/api/src/shared/domain/index.ts
 * -----------------------------------------------------------------------------
 *
 * 🌌 DSS Universe
 * Shared Domain Public API
 *
 * This file exposes the public API of the shared domain layer.
 *
 * Feature modules should prefer importing from this file instead of performing
 * deep imports whenever practical.
 *
 * The shared domain layer contains only business-neutral building blocks.
 * It must never know about feature modules or infrastructure.
 *
 * -----------------------------------------------------------------------------
 */

export type { PaginationOptions } from './types/pagination-options.type';
export type { PaginatedResult } from './types/paginated-result.type';

export type { BaseQueryRepository } from './repositories/base-query.repository.interface';
export type { BaseMutationRepository } from './repositories/base-mutation.repository.interface';
